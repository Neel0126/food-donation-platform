const Donation = require('../models/Donation');
const Notification = require('../models/Notification');

/**
 * Calculates expiration timestamp based on available window text or duration hours
 * @param {string|number} availableTime e.g. "Within 2-3 hours", "Within 6 hours", "Within 24 hours"
 * @param {Date|string} baseDate baseline timestamp, defaults to now
 * @returns {Date}
 */
const calculateExpiresAt = (availableTime, baseDate = new Date()) => {
  const base = new Date(baseDate).getTime();
  let hours = 6; // safe default: 6 hours

  if (typeof availableTime === 'string') {
    const lower = availableTime.toLowerCase();
    if (lower.includes('2-3') || lower.includes('2 hours') || lower.includes('3 hours')) {
      hours = 3;
    } else if (lower.includes('6 hours') || lower.includes('today')) {
      hours = 6;
    } else if (lower.includes('24 hours') || lower.includes('1 day')) {
      hours = 24;
    } else if (lower.includes('multiple days') || lower.includes('packaged') || lower.includes('dry')) {
      hours = 72; // 3 days for packaged/dry provisions
    } else {
      const match = lower.match(/(\d+)\s*hour/);
      if (match) {
        hours = parseInt(match[1], 10);
      }
    }
  } else if (typeof availableTime === 'number' && !isNaN(availableTime) && availableTime > 0) {
    hours = availableTime;
  }

  return new Date(base + hours * 60 * 60 * 1000);
};

/**
 * Checks all pending donations, backfills missing expiresAt for legacy records,
 * and transitions any past-due pending donations to 'expired'.
 * Creates a donor notification for each newly expired donation.
 */
const checkAndExpireDonations = async () => {
  try {
    const now = new Date();

    // 1. Backfill legacy pending donations lacking expiresAt
    const unindexedPending = await Donation.find({
      status: 'pending',
      $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }]
    });

    for (const d of unindexedPending) {
      let windowText = d.pickupWindow;
      if (!windowText && d.description) {
        const match = d.description.match(/Pickup window:\s*([^|]+)/i);
        if (match) windowText = match[1].trim();
      }
      d.expiresAt = calculateExpiresAt(windowText, d.createdAt || now);
      await d.save();
    }

    // 2. Atomically transition expired pending donations
    const expiredList = await Donation.find({
      status: 'pending',
      expiresAt: { $lte: now }
    });

    for (const d of expiredList) {
      // Case 25: Atomic check-and-set prevents race conditions between multiple workers
      const transitioned = await Donation.findOneAndUpdate(
        { _id: d._id, status: 'pending', expiresAt: { $lte: now } },
        {
          $set: { status: 'expired' },
          $push: {
            timeline: {
              status: 'expired',
              description: 'Pickup window expired without an NGO partner confirmation',
              time: now
            }
          }
        },
        { new: true }
      );

      if (!transitioned) continue; // Another worker instance already transitioned this donation

      // Send in-app notification to the donor
      try {
        await Notification.create({
          user: transitioned.donor,
          message: `Your food donation of "${transitioned.foodType}" (${transitioned.quantity}) was not accepted before the consumption window ended and has been marked as expired for food safety.`,
          type: 'donation_status',
          relatedDonation: transitioned._id
        });
      } catch (notifErr) {
        console.error(`Failed to send expiration notification for donation ${transitioned._id}:`, notifErr.message);
      }
    }

    // 3. Atomically transition uncollected accepted/assigned donations past expiry
    const expiredUncollected = await Donation.find({
      status: { $in: ['accepted', 'assigned', 'scheduled'] },
      $or: [{ pickedUpAt: null }, { pickedUpAt: { $exists: false } }],
      expiresAt: { $lte: now }
    });

    for (const d of expiredUncollected) {
      const volunteerToRelease = d.assignedVolunteer;

      // Case 25: Atomic transition ensures volunteer activeDeliveries is only decremented ONCE
      const transitioned = await Donation.findOneAndUpdate(
        {
          _id: d._id,
          status: { $in: ['accepted', 'assigned', 'scheduled'] },
          $or: [{ pickedUpAt: null }, { pickedUpAt: { $exists: false } }],
          expiresAt: { $lte: now }
        },
        {
          $set: {
            status: 'expired',
            assignedVolunteer: null,
            volunteerStatus: 'unassigned'
          },
          $push: {
            timeline: {
              status: 'expired',
              description: 'Pickup window elapsed before food could be collected by partner',
              time: now
            }
          }
        },
        { new: true }
      );

      if (!transitioned) continue; // Another worker instance already processed this

      // Notify donor
      try {
        await Notification.create({
          user: transitioned.donor,
          message: `Your food donation of "${transitioned.foodType}" was not collected within the pickup window and has been marked as expired for safety.`,
          type: 'donation_status',
          relatedDonation: transitioned._id
        });
      } catch (e) {}

      // Notify NGO
      if (transitioned.acceptedBy) {
        try {
          await Notification.create({
            user: transitioned.acceptedBy,
            message: `Donation "${transitioned.foodType}" has expired as the pickup window elapsed before food collection.`,
            type: 'donation_status',
            relatedDonation: transitioned._id
          });
        } catch (e) {}
      }

      // If volunteer was assigned, release volunteer availability exactly once
      if (volunteerToRelease) {
        try {
          await Notification.create({
            user: volunteerToRelease,
            message: `Pickup task for "${transitioned.foodType}" was closed due to food shelf-life expiry.`,
            type: 'donation_status',
            relatedDonation: transitioned._id
          });
          const VolunteerProfile = require('../models/VolunteerProfile');
          const volProfile = await VolunteerProfile.findOne({ user: volunteerToRelease });
          if (volProfile) {
            volProfile.activeDeliveries = Math.max(0, (volProfile.activeDeliveries || 1) - 1);
            if (volProfile.activeDeliveries === 0) {
              volProfile.availabilityStatus = 'available';
            }
            await volProfile.save();
          }
        } catch (e) {}
      }
    }

    // 4. Crash-recovery self-healing: Reconcile active volunteer delivery counters
    // Guarantees no volunteer remains stuck in 'busy' if a server crash interrupted a release
    try {
      const VolunteerProfile = require('../models/VolunteerProfile');
      const activeVolunteers = await VolunteerProfile.find({ activeDeliveries: { $gt: 0 } });
      for (const vp of activeVolunteers) {
        const realActiveTasks = await Donation.countDocuments({
          assignedVolunteer: vp.user,
          status: { $in: ['assigned', 'picked_up'] }
        });
        if (vp.activeDeliveries !== realActiveTasks) {
          vp.activeDeliveries = realActiveTasks;
          if (realActiveTasks === 0 && vp.availabilityStatus === 'busy') {
            vp.availabilityStatus = 'available';
          }
          await vp.save();
        }
      }
    } catch (healErr) {
      console.error('[ExpirationService] Error in counter reconciliation:', healErr.message);
    }

    const totalExpired = expiredList.length + expiredUncollected.length;
    if (totalExpired > 0) {
      console.log(`[ExpirationService] Auto-expired ${totalExpired} past-due donation(s) at ${now.toISOString()}`);
    }

    return totalExpired;
  } catch (error) {
    console.error('[ExpirationService] Error checking expired donations:', error);
    return 0;
  }
};

/**
 * Starts background interval timer to sweep for expired donations every intervalMs
 * @param {number} intervalMs Defaults to 60,000ms (1 minute)
 */
const startExpirationCron = (intervalMs = 60000) => {
  // Run sweep immediately on launch
  checkAndExpireDonations();

  const intervalId = setInterval(() => {
    checkAndExpireDonations();
  }, intervalMs);

  if (intervalId.unref) {
    intervalId.unref();
  }

  console.log(`[ExpirationService] Automated food donation expiration monitor started (interval: ${intervalMs / 1000}s)`);
  return intervalId;
};

module.exports = {
  calculateExpiresAt,
  checkAndExpireDonations,
  startExpirationCron
};

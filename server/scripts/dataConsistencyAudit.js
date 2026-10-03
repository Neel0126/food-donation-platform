/**
 * Production Database Invariant & Consistency Audit Script
 * Evaluates all records in MongoDB against core business rules and data constraints.
 * Run: node server/scripts/dataConsistencyAudit.js [--heal]
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const Donation = require('../models/Donation');
const VolunteerProfile = require('../models/VolunteerProfile');
const User = require('../models/User');
const NgoProfile = require('../models/NgoProfile');

const shouldHeal = process.argv.includes('--heal') || process.argv.includes('--fix');

async function auditDataConsistency() {
  console.log('====================================================');
  console.log(`   DATA INTEGRITY & INVARIANT AUDIT SUITE ${shouldHeal ? '(--heal mode)' : ''}   `);
  console.log('====================================================');

  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/food-donation');
    console.log('✅ Connected to MongoDB\n');

    let totalViolations = 0;
    const report = [];

    const recordViolation = (invariant, details) => {
      totalViolations++;
      report.push({ invariant, details });
      console.error(`❌ VIOLATION [${invariant}]:`, details);
    };

    // ─────────────────────────────────────────────────────────────
    // INVARIANT 1 & 2: Volunteer Counter Non-Negativity
    // ─────────────────────────────────────────────────────────────
    console.log('Checking Invariant 1 & 2: Volunteer Delivery Counters >= 0...');
    const allProfiles = await VolunteerProfile.find();
    let negativeActiveCount = 0;
    let negativeCompletedCount = 0;

    for (const vp of allProfiles) {
      if ((vp.activeDeliveries || 0) < 0) {
        negativeActiveCount++;
        recordViolation('activeDeliveries >= 0', `Volunteer ${vp.user} has activeDeliveries = ${vp.activeDeliveries}`);
        if (shouldHeal) {
          vp.activeDeliveries = 0;
          await vp.save();
        }
      }
      if ((vp.completedDeliveries || 0) < 0) {
        negativeCompletedCount++;
        recordViolation('completedDeliveries >= 0', `Volunteer ${vp.user} has completedDeliveries = ${vp.completedDeliveries}`);
        if (shouldHeal) {
          vp.completedDeliveries = 0;
          await vp.save();
        }
      }
    }
    if (negativeActiveCount === 0 && negativeCompletedCount === 0) {
      console.log(`✅ Invariant 1 & 2 PASSED: All ${allProfiles.length} volunteer profiles have non-negative delivery counters.`);
    }

    // ─────────────────────────────────────────────────────────────
    // INVARIANT 3: Volunteer Active Deliveries Exact Match
    // ─────────────────────────────────────────────────────────────
    console.log('\nChecking Invariant 3: Volunteer activeDeliveries matches real in-flight tasks...');
    let counterMismatches = 0;
    for (const vp of allProfiles) {
      const actualActiveTasks = await Donation.countDocuments({
        assignedVolunteer: vp.user,
        status: { $in: ['assigned', 'picked_up'] }
      });

      const recordedActive = vp.activeDeliveries || 0;
      if (actualActiveTasks !== recordedActive) {
        counterMismatches++;
        recordViolation(
          'activeDeliveries matches active tasks',
          `Volunteer ${vp.user} recorded activeDeliveries = ${recordedActive}, but actual active tasks in DB = ${actualActiveTasks}`
        );
        if (shouldHeal) {
          vp.activeDeliveries = actualActiveTasks;
          if (actualActiveTasks === 0 && vp.availabilityStatus === 'busy') {
            vp.availabilityStatus = 'available';
          }
          await vp.save();
          console.log(`🔧 HEALED: Resynced volunteer ${vp.user} activeDeliveries to ${actualActiveTasks}`);
        }
      }
    }
    if (counterMismatches === 0) {
      console.log(`✅ Invariant 3 PASSED: All ${allProfiles.length} volunteers have exact task-counter synchronization.`);
    }

    // ─────────────────────────────────────────────────────────────
    // INVARIANT 4: Expired Donations Cannot Have Active Volunteers
    // ─────────────────────────────────────────────────────────────
    console.log('\nChecking Invariant 4: Expired donations have no assigned active volunteers...');
    const expiredWithActiveVolunteers = await Donation.find({
      status: 'expired',
      assignedVolunteer: { $ne: null }
    });
    if (expiredWithActiveVolunteers.length > 0) {
      for (const d of expiredWithActiveVolunteers) {
        recordViolation('expired donation cannot have active volunteer', `Donation ${d._id} is expired but assigned to ${d.assignedVolunteer}`);
        if (shouldHeal) {
          d.assignedVolunteer = null;
          d.volunteerStatus = 'unassigned';
          await d.save();
          console.log(`🔧 HEALED: Nullified assigned volunteer on expired donation ${d._id}`);
        }
      }
    } else {
      const totalExpired = await Donation.countDocuments({ status: 'expired' });
      console.log(`✅ Invariant 4 PASSED: All ${totalExpired} expired donations have zero lingering volunteer assignments.`);
    }

    // ─────────────────────────────────────────────────────────────
    // INVARIANT 5: Pending Donations Cannot Have Assigned Volunteer or NGO
    // ─────────────────────────────────────────────────────────────
    console.log('\nChecking Invariant 5: Pending donations must not have acceptedBy or assignedVolunteer...');
    const invalidPending = await Donation.find({
      status: 'pending',
      $or: [{ acceptedBy: { $ne: null } }, { assignedVolunteer: { $ne: null } }]
    });
    if (invalidPending.length > 0) {
      for (const d of invalidPending) {
        recordViolation('pending donation has no assignee', `Donation ${d._id} is pending but has acceptedBy=${d.acceptedBy} or volunteer=${d.assignedVolunteer}`);
        if (shouldHeal) {
          d.acceptedBy = null;
          d.assignedVolunteer = null;
          await d.save();
        }
      }
    } else {
      const totalPending = await Donation.countDocuments({ status: 'pending' });
      console.log(`✅ Invariant 5 PASSED: All ${totalPending} pending donations are completely unassigned.`);
    }

    // ─────────────────────────────────────────────────────────────
    // INVARIANT 6: Assigned Donations Must Have assignedVolunteer
    // ─────────────────────────────────────────────────────────────
    console.log('\nChecking Invariant 6: Assigned donations must have assignedVolunteer set...');
    const invalidAssigned = await Donation.find({
      status: 'assigned',
      assignedVolunteer: null
    });
    if (invalidAssigned.length > 0) {
      for (const d of invalidAssigned) {
        recordViolation('assigned donation must have assignedVolunteer', `Donation ${d._id} has status="assigned" but assignedVolunteer is null`);
        if (shouldHeal) {
          d.status = 'accepted';
          d.volunteerStatus = 'unassigned';
          await d.save();
        }
      }
    } else {
      const totalAssigned = await Donation.countDocuments({ status: 'assigned' });
      console.log(`✅ Invariant 6 PASSED: All ${totalAssigned} assigned donations have assignedVolunteer set.`);
    }

    // ─────────────────────────────────────────────────────────────
    // INVARIANT 7: Delivered Donations Must Have Completed Timeline Entry
    // ─────────────────────────────────────────────────────────────
    console.log('\nChecking Invariant 7: Delivered donations must have delivery audit trail...');
    const deliveredDonations = await Donation.find({ status: 'delivered' });
    let missingAuditDelivered = 0;
    for (const d of deliveredDonations) {
      const hasDeliveredTimeline = d.timeline?.some((t) => t.status === 'delivered');
      if (!hasDeliveredTimeline) {
        missingAuditDelivered++;
        recordViolation('delivered donation timeline record', `Donation ${d._id} is delivered but lacks a 'delivered' timeline audit entry`);
        if (shouldHeal) {
          d.timeline.push({
            status: 'delivered',
            description: 'Food donation successfully delivered',
            time: d.updatedAt || d.createdAt || new Date()
          });
          await d.save();
          console.log(`🔧 HEALED: Backfilled delivered timeline record for donation ${d._id}`);
        }
      }
    }
    if (missingAuditDelivered === 0) {
      console.log(`✅ Invariant 7 PASSED: All ${deliveredDonations.length} delivered donations have full audit logs.`);
    }

    // ─────────────────────────────────────────────────────────────
    // INVARIANT 8: Picked Up Donations Must Have Verified Pickup OTP
    // ─────────────────────────────────────────────────────────────
    console.log('\nChecking Invariant 8: In-transit donations have verified pickup OTP...');
    const pickedUpDonations = await Donation.find({ status: 'picked_up' });
    let unverifiedPickups = 0;
    for (const d of pickedUpDonations) {
      if (!d.pickupOtpVerified) {
        unverifiedPickups++;
        recordViolation('picked_up must have verified OTP', `Donation ${d._id} is picked_up but pickupOtpVerified is false`);
        if (shouldHeal) {
          d.pickupOtpVerified = true;
          await d.save();
        }
      }
    }
    if (unverifiedPickups === 0) {
      console.log(`✅ Invariant 8 PASSED: All ${pickedUpDonations.length} in-transit pickups have verified pickup OTPs.`);
    }

    // ─────────────────────────────────────────────────────────────
    // INVARIANT 9: Volunteer Ratings Integrity (0 <= rating <= 5)
    // ─────────────────────────────────────────────────────────────
    console.log('\nChecking Invariant 9: Volunteer rating bounds (0 <= rating <= 5)...');
    let badRatings = 0;
    for (const vp of allProfiles) {
      if (vp.rating < 0 || vp.rating > 5) {
        badRatings++;
        recordViolation('0 <= rating <= 5', `Volunteer ${vp.user} has out-of-bounds rating: ${vp.rating}`);
        if (shouldHeal) {
          vp.rating = Math.min(5, Math.max(0, vp.rating || 5));
          await vp.save();
        }
      }
    }
    if (badRatings === 0) {
      console.log(`✅ Invariant 9 PASSED: All volunteer ratings conform to standard [0, 5] bounds.`);
    }

    // ─────────────────────────────────────────────────────────────
    // FINAL AUDIT SUMMARY
    // ─────────────────────────────────────────────────────────────
    console.log('\n====================================================');
    if (totalViolations === 0) {
      console.log('🎉 AUDIT RESULT: 100% DATA CONSISTENCY ACHIEVED! 🎉');
      console.log('   All 9 structural and behavioral invariants hold.');
      console.log('====================================================\n');
    } else {
      if (shouldHeal) {
        console.log(`🔧 Repaired all ${totalViolations} historical invariant violations.`);
        console.log('====================================================\n');
      } else {
        console.error(`⚠️ AUDIT RESULT: FOUND ${totalViolations} INVARIANT VIOLATIONS!`);
        console.log('Run with --heal to automatically repair historical inconsistencies.');
        console.log('====================================================\n');
        process.exit(1);
      }
    }
  } finally {
    await mongoose.disconnect();
  }
}

auditDataConsistency().catch((err) => {
  console.error('Audit script failed:', err);
  process.exit(1);
});

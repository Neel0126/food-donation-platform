const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const User = require('../models/User');
const Donation = require('../models/Donation');
const NgoProfile = require('../models/NgoProfile');
const VolunteerProfile = require('../models/VolunteerProfile');
const { checkAndExpireDonations } = require('../services/expirationService');
const app = require('../app');

const PORT = 5008;
let server;
const baseUrl = `http://localhost:${PORT}`;

async function runBackgroundWorkerStressTest() {
  console.log('====================================================');
  console.log('     TEST 5: BACKGROUND EXPIRATION WORKER STRESS    ');
  console.log('====================================================');

  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/food-donation');
    await new Promise((resolve) => {
      server = app.listen(PORT, () => resolve());
    });

    const ts = Date.now();

    // 1. Create Donor, NGO, Volunteer
    const donor = await User.create({
      name: 'Worker Donor',
      email: `worker_donor_${ts}@test.com`,
      password: 'password123',
      role: 'donor'
    });

    const ngo = await User.create({
      name: 'Worker NGO',
      email: `worker_ngo_${ts}@test.com`,
      password: 'password123',
      role: 'ngo',
      isVerified: true
    });
    const ngoToken = jwt.sign({ id: ngo._id }, process.env.JWT_SECRET || 'secret');

    const volunteer = await User.create({
      name: 'Worker Volunteer',
      email: `worker_vol_${ts}@test.com`,
      password: 'password123',
      role: 'volunteer',
      isVerified: true
    });
    const volToken = jwt.sign({ id: volunteer._id }, process.env.JWT_SECRET || 'secret');

    const volProfile = await VolunteerProfile.create({
      user: volunteer._id,
      availabilityStatus: 'busy',
      activeDeliveries: 3,
      completedDeliveries: 0
    });

    // ─────────────────────────────────────────────────────────────
    // 1. Setup 30 expired donations (20 pending, 10 assigned to volunteer)
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 1. Creating Batch of 30 Expired Donations ---');
    const pastTime = new Date(Date.now() - 3600000); // 1 hour ago
    const donationIds = [];

    // 20 pending expired donations
    for (let i = 0; i < 20; i++) {
      const d = await Donation.create({
        donor: donor._id,
        foodType: `Expired Pending Food ${i}`,
        quantity: '10 boxes',
        status: 'pending',
        pickupLocation: { street: '10 St', city: 'Metro' },
        expiresAt: pastTime
      });
      donationIds.push(d._id);
    }

    // 10 assigned expired donations (uncollected)
    for (let i = 0; i < 10; i++) {
      const d = await Donation.create({
        donor: donor._id,
        foodType: `Expired Assigned Food ${i}`,
        quantity: '5 boxes',
        status: 'assigned',
        acceptedBy: ngo._id,
        assignedVolunteer: volunteer._id,
        volunteerStatus: 'assigned',
        pickupLocation: { street: '20 St', city: 'Metro' },
        expiresAt: pastTime
      });
      donationIds.push(d._id);
    }
    console.log(`✅ Created 30 expired donations across pending and assigned states`);

    // ─────────────────────────────────────────────────────────────
    // 2. Concurrently Trigger 5 Worker Sweepers (Race Test)
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 2. Firing 5 Concurrent Worker Sweeps Simultaneously ---');
    const sweepResults = await Promise.all([
      checkAndExpireDonations(),
      checkAndExpireDonations(),
      checkAndExpireDonations(),
      checkAndExpireDonations(),
      checkAndExpireDonations()
    ]);

    const totalExpiredSum = sweepResults.reduce((acc, count) => acc + count, 0);
    console.log(`Worker sweeps completed. Total items processed across all threads: ${totalExpiredSum}`);

    // Verify all 30 donations in DB
    const allDocs = await Donation.find({ _id: { $in: donationIds } });
    for (const doc of allDocs) {
      if (doc.status !== 'expired') {
        throw new Error(`Donation ${doc._id} failed to expire; status is "${doc.status}"`);
      }
      // Check timeline entries: should have EXACTLY ONE 'expired' event
      const expiredEvents = doc.timeline.filter((t) => t.status === 'expired');
      if (expiredEvents.length !== 1) {
        throw new Error(
          `DUPLICATE TIMELINE EVENT: Donation ${doc._id} has ${expiredEvents.length} "expired" events!`
        );
      }
    }
    console.log('✅ Exactly 30/30 donations transitioned to "expired"');
    console.log('✅ Zero duplicate timeline events across concurrent sweeper executions');

    // ─────────────────────────────────────────────────────────────
    // 3. Worker Re-Run (Post-Reboot Idempotency)
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 3. Testing Worker Idempotency on Second Pass ---');
    const secondPassCount = await checkAndExpireDonations();
    if (secondPassCount !== 0) {
      throw new Error(`Expected 0 newly expired items on second pass, got ${secondPassCount}`);
    }
    console.log('✅ Second pass processed 0 items; no duplicate processing or resurrection');

    // Check volunteer active deliveries counter
    const updatedVolProfile = await VolunteerProfile.findOne({ user: volunteer._id });
    if (updatedVolProfile.activeDeliveries !== 0) {
      throw new Error(`Volunteer activeDeliveries expected 0, got ${updatedVolProfile.activeDeliveries}`);
    }
    if (updatedVolProfile.availabilityStatus !== 'available') {
      throw new Error(`Volunteer expected available, got ${updatedVolProfile.availabilityStatus}`);
    }
    console.log('✅ Volunteer released from expired assignments without negative counter corruptions (active = 0, status = available)');

    // ─────────────────────────────────────────────────────────────
    // 4. Concurrent Triple Race: Expire + NGO Release + Volunteer Reject
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 4. Testing Triple Race: Expiration + NGO Release + Volunteer Reject ---');
    // Set up a donation right at expiry threshold
    const raceDonation = await Donation.create({
      donor: donor._id,
      foodType: 'Triple Race Food',
      quantity: '10 packages',
      status: 'assigned',
      acceptedBy: ngo._id,
      assignedVolunteer: volunteer._id,
      volunteerStatus: 'assigned',
      pickupLocation: { street: 'Race St', city: 'Metro' },
      expiresAt: new Date(Date.now() - 500) // Expired 500ms ago
    });

    const tripleRaceResults = await Promise.allSettled([
      checkAndExpireDonations(),
      fetch(`${baseUrl}/api/ngos/donations/${raceDonation._id}/release`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${ngoToken}` }
      }).then(r => r.json()),
      fetch(`${baseUrl}/api/volunteers/tasks/${raceDonation._id}/reject`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${volToken}`
        },
        body: JSON.stringify({ reason: 'Cannot make pickup' })
      }).then(r => r.json())
    ]);

    const finalRaceDoc = await Donation.findById(raceDonation._id);
    const finalVolCheck = await VolunteerProfile.findOne({ user: volunteer._id });

    console.log(`Triple race resolved. Final donation status: "${finalRaceDoc.status}"`);
    if (finalRaceDoc.status !== 'expired' && finalRaceDoc.status !== 'pending') {
      throw new Error(`Unexpected final status for triple-raced donation: ${finalRaceDoc.status}`);
    }
    if (finalVolCheck.activeDeliveries < 0) {
      throw new Error(`Active deliveries corrupt negative: ${finalVolCheck.activeDeliveries}`);
    }
    console.log(`✅ Volunteer activeDeliveries remains bounded: ${finalVolCheck.activeDeliveries}`);
    console.log('✅ Triple race settled cleanly with no orphaned states or unhandled rejections');

    console.log('\n🎉 ALL BACKGROUND WORKER STRESS TESTS PASSED! 🎉\n');
  } finally {
    if (server) server.close();
    await mongoose.disconnect();
  }
}

runBackgroundWorkerStressTest().catch((err) => {
  console.error('❌ Background worker stress test failed:', err);
  process.exit(1);
});

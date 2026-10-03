const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const User = require('../models/User');
const Donation = require('../models/Donation');
const NgoProfile = require('../models/NgoProfile');
const VolunteerProfile = require('../models/VolunteerProfile');
const app = require('../app');

const PORT = 5005;
let server;
const baseUrl = `http://localhost:${PORT}`;

async function runRaceConditionStressTest() {
  console.log('====================================================');
  console.log('   TEST 2: HIGH-CONCURRENCY RACE CONDITION STRESS   ');
  console.log('====================================================');

  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/food-donation');
    await new Promise((resolve) => {
      server = app.listen(PORT, () => resolve());
    });

    const ts = Date.now();

    // 1. Create Donor
    const donor = await User.create({
      name: 'Stress Donor',
      email: `donor_stress_${ts}@test.com`,
      password: 'password123',
      role: 'donor'
    });
    const donorToken = jwt.sign({ id: donor._id }, process.env.JWT_SECRET || 'secret');

    // 2. Create 10 distinct NGOs
    console.log('\nSetting up 10 verified NGO partners...');
    const ngos = [];
    const ngoTokens = [];
    for (let i = 0; i < 10; i++) {
      const ngoUser = await User.create({
        name: `Stress NGO ${i}`,
        email: `ngo_stress_${i}_${ts}@test.com`,
        password: 'password123',
        role: 'ngo',
        isVerified: true
      });
      await NgoProfile.create({
        user: ngoUser._id,
        organizationName: `NGO Org ${i}`,
        registrationNumber: `REG-STRESS-${i}-${ts}`,
        verificationStatus: 'approved'
      });
      ngos.push(ngoUser);
      ngoTokens.push(jwt.sign({ id: ngoUser._id }, process.env.JWT_SECRET || 'secret'));
    }

    // 3. Create 10 distinct Volunteers
    console.log('Setting up 10 active delivery volunteers...');
    const volunteers = [];
    const volTokens = [];
    for (let i = 0; i < 10; i++) {
      const volUser = await User.create({
        name: `Stress Volunteer ${i}`,
        email: `vol_stress_${i}_${ts}@test.com`,
        password: 'password123',
        role: 'volunteer',
        isVerified: true
      });
      await VolunteerProfile.create({
        user: volUser._id,
        availabilityStatus: 'available',
        activeDeliveries: 0,
        completedDeliveries: 0
      });
      volunteers.push(volUser);
      volTokens.push(jwt.sign({ id: volUser._id }, process.env.JWT_SECRET || 'secret'));
    }

    // ─────────────────────────────────────────────────────────────
    // RACE 1: 10 NGOs concurrently accepting the same donation
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 1. Testing 10 Concurrent NGO Accept Requests ---');
    const donation1 = await Donation.create({
      donor: donor._id,
      foodType: 'Hot Meal Packets',
      quantity: '50 boxes',
      pickupLocation: { street: '100 Concord St', city: 'Metro' },
      status: 'pending',
      expiresAt: new Date(Date.now() + 3600000)
    });

    const acceptPromises = ngoTokens.map((token) =>
      fetch(`${baseUrl}/api/ngos/donations/${donation1._id}/accept`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      }).then(async (res) => ({ status: res.status, body: await res.json() }))
    );

    const acceptResults = await Promise.all(acceptPromises);
    const accept200s = acceptResults.filter((r) => r.status === 200);
    const acceptConflicts = acceptResults.filter((r) => r.status === 409 || r.status === 400);

    console.log(`Results: ${accept200s.length} succeeded (200), ${acceptConflicts.length} received conflict/rejection`);
    if (accept200s.length !== 1) {
      throw new Error(`CRITICAL RACE FAILURE: ${accept200s.length} NGOs claimed the same donation!`);
    }

    const checkDon1 = await Donation.findById(donation1._id);
    if (checkDon1.status !== 'accepted') {
      throw new Error(`Donation status is inconsistent: ${checkDon1.status}`);
    }
    console.log('✅ Exactly 1 NGO claimed donation; DB remains mutually consistent');

    // ─────────────────────────────────────────────────────────────
    // RACE 2: 10 Volunteers concurrently accepting the same task
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 2. Testing 10 Concurrent Volunteer Task Claims ---');
    checkDon1.volunteerRequested = true;
    checkDon1.volunteerStatus = 'unassigned';
    checkDon1.pickupOtp = '654321';
    checkDon1.deliveryOtp = '123456';
    await checkDon1.save();

    const taskClaimPromises = volTokens.map((token) =>
      fetch(`${baseUrl}/api/volunteers/tasks/${checkDon1._id}/accept`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      }).then(async (res) => ({ status: res.status, body: await res.json() }))
    );

    const claimResults = await Promise.all(taskClaimPromises);
    const claim200s = claimResults.filter((r) => r.status === 200);
    const claimConflicts = claimResults.filter((r) => r.status === 409 || r.status === 400);

    console.log(`Results: ${claim200s.length} claim succeeded, ${claimConflicts.length} rejected/conflicted`);
    if (claim200s.length !== 1) {
      throw new Error(`CRITICAL RACE FAILURE: ${claim200s.length} volunteers claimed the same task!`);
    }

    const checkTask = await Donation.findById(checkDon1._id);
    if (checkTask.status !== 'assigned' || !checkTask.assignedVolunteer) {
      throw new Error('Task state inconsistent after concurrent claims');
    }
    console.log('✅ Exactly 1 volunteer assigned; other 9 properly rejected');

    // ─────────────────────────────────────────────────────────────
    // RACE 3: Concurrent Pickup OTP Verifications (Double-click/retry)
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 3. Testing 10 Concurrent Pickup OTP Verifications ---');
    const winningVolToken = volTokens[volunteers.findIndex((v) => v._id.toString() === checkTask.assignedVolunteer.toString())];

    const otpPromises = Array(10)
      .fill(null)
      .map(() =>
        fetch(`${baseUrl}/api/volunteers/tasks/${checkTask._id}/verify-pickup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${winningVolToken}`
          },
          body: JSON.stringify({ otp: '654321' })
        }).then(async (res) => ({ status: res.status, body: await res.json() }))
      );

    const otpResults = await Promise.all(otpPromises);
    const otpSuccesses = otpResults.filter((r) => r.status === 200);
    console.log(`Results: ${otpSuccesses.length} successful (including idempotent calls)`);

    const checkPickedUp = await Donation.findById(checkTask._id);
    if (checkPickedUp.status !== 'picked_up' || !checkPickedUp.pickupOtpVerified) {
      throw new Error('Donation failed to advance cleanly to picked_up state');
    }
    console.log('✅ Concurrent OTP verification handled cleanly and idempotently');

    // ─────────────────────────────────────────────────────────────
    // RACE 4: Concurrent Complete Task Calls
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 4. Testing 10 Concurrent Task Completion Requests ---');
    checkPickedUp.deliveryOtpVerified = true;
    await checkPickedUp.save();

    const completePromises = Array(10)
      .fill(null)
      .map(() =>
        fetch(`${baseUrl}/api/volunteers/tasks/${checkPickedUp._id}/complete`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${winningVolToken}`
          },
          body: JSON.stringify({ deliveryOtp: '123456' })
        }).then(async (res) => ({ status: res.status, body: await res.json() }))
      );

    const completeResults = await Promise.all(completePromises);
    const complete200s = completeResults.filter((r) => r.status === 200);
    console.log(`Results: ${complete200s.length} returned 200 OK (idempotent completions)`);

    const checkDelivered = await Donation.findById(checkPickedUp._id);
    if (checkDelivered.status !== 'delivered') {
      throw new Error(`Expected delivered status, got ${checkDelivered.status}`);
    }

    const assignedVolProfile = await VolunteerProfile.findOne({ user: checkTask.assignedVolunteer });
    if (assignedVolProfile.completedDeliveries !== 1) {
      throw new Error(
        `COUNTER CORRUPTION DETECTED: completedDeliveries was incremented ${assignedVolProfile.completedDeliveries} times instead of 1!`
      );
    }
    if (assignedVolProfile.activeDeliveries !== 0) {
      throw new Error(`activeDeliveries is ${assignedVolProfile.activeDeliveries}, expected 0`);
    }
    console.log('✅ Completion is idempotent: volunteer completedDeliveries incremented EXACTLY ONCE (1)');

    // ─────────────────────────────────────────────────────────────
    // RACE 5: 10 Concurrent Cancellation Requests on a Pending Donation
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 5. Testing 10 Concurrent Cancellation Requests ---');
    const donToCancel = await Donation.create({
      donor: donor._id,
      foodType: 'Surplus Pastries',
      quantity: '20 pcs',
      pickupLocation: { street: '50 Elm St', city: 'Metro' },
      status: 'pending'
    });

    const cancelPromises = Array(10)
      .fill(null)
      .map(() =>
        fetch(`${baseUrl}/api/donations/${donToCancel._id}/cancel`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${donorToken}` }
        }).then(async (res) => ({ status: res.status, body: await res.json() }))
      );

    const cancelResults = await Promise.all(cancelPromises);
    const cancel200s = cancelResults.filter((r) => r.status === 200);
    console.log(`Results: ${cancel200s.length} returned 200 (all idempotent)`);

    const checkCancelled = await Donation.findById(donToCancel._id);
    if (checkCancelled.status !== 'cancelled') {
      throw new Error(`Expected status 'cancelled', got ${checkCancelled.status}`);
    }
    console.log('✅ Concurrent cancellation resolved idempotently without DB corruption');

    console.log('\n🎉 ALL RACE-CONDITION STRESS TESTS PASSED SUCCESSFULLY! 🎉\n');
  } finally {
    if (server) server.close();
    await mongoose.disconnect();
  }
}

runRaceConditionStressTest().catch((err) => {
  console.error('❌ Race condition stress test failed:', err);
  process.exit(1);
});

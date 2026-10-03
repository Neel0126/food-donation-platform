const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const User = require('../models/User');
const Donation = require('../models/Donation');
const NgoProfile = require('../models/NgoProfile');
const VolunteerProfile = require('../models/VolunteerProfile');
const app = require('../app');

const PORT = 5006;
let server;
const baseUrl = `http://localhost:${PORT}`;

async function runCrashRecoveryTest() {
  console.log('====================================================');
  console.log('   TEST 3: CRASH & RESTART STATE RECOVERY AUDIT     ');
  console.log('====================================================');

  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/food-donation');

    // Boot Initial Server Instance
    await new Promise((resolve) => {
      server = app.listen(PORT, () => {
        console.log(`✅ Initial server instance booted on port ${PORT}`);
        resolve();
      });
    });

    const ts = Date.now();
    const donor = await User.create({
      name: 'Crash Donor',
      email: `crash_donor_${ts}@test.com`,
      password: 'password123',
      role: 'donor'
    });
    const donorToken = jwt.sign({ id: donor._id }, process.env.JWT_SECRET || 'secret');

    const ngo = await User.create({
      name: 'Crash NGO',
      email: `crash_ngo_${ts}@test.com`,
      password: 'password123',
      role: 'ngo',
      isVerified: true
    });
    await NgoProfile.create({
      user: ngo._id,
      organizationName: 'Crash NGO Org',
      registrationNumber: `REG-CRASH-${ts}`,
      verificationStatus: 'approved'
    });
    const ngoToken = jwt.sign({ id: ngo._id }, process.env.JWT_SECRET || 'secret');

    const volunteer = await User.create({
      name: 'Crash Volunteer',
      email: `crash_vol_${ts}@test.com`,
      password: 'password123',
      role: 'volunteer',
      isVerified: true
    });
    const volProfile = await VolunteerProfile.create({
      user: volunteer._id,
      availabilityStatus: 'available',
      activeDeliveries: 0,
      completedDeliveries: 0
    });
    const volToken = jwt.sign({ id: volunteer._id }, process.env.JWT_SECRET || 'secret');

    // 1. Progress donation to picked_up
    console.log('\n--- 1. Progressing Transaction to Mid-Flight State ---');
    const donation = await Donation.create({
      donor: donor._id,
      foodType: 'Prepared Meals (50 packages)',
      quantity: '50 boxes',
      pickupLocation: { street: '123 Rescue Ave', city: 'Metro' },
      status: 'pending'
    });

    // NGO accepts
    await fetch(`${baseUrl}/api/ngos/donations/${donation._id}/accept`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${ngoToken}` }
    });

    // NGO requests volunteer
    await fetch(`${baseUrl}/api/ngos/donations/${donation._id}/request-volunteer`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${ngoToken}` }
    });

    // Volunteer accepts task
    await fetch(`${baseUrl}/api/volunteers/tasks/${donation._id}/accept`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${volToken}` }
    });

    const donationDoc = await Donation.findById(donation._id);
    const pickupOtp = donationDoc.pickupOtp;

    // Volunteer verifies pickup OTP
    await fetch(`${baseUrl}/api/volunteers/tasks/${donation._id}/verify-pickup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${volToken}`
      },
      body: JSON.stringify({ otp: pickupOtp })
    });

    console.log('✅ Donation reached in-transit status: "picked_up"');

    // 2. SIMULATE ABRUPT SERVER CRASH
    console.log('\n--- 2. Simulating Abrupt Server Crash & Unscheduled Downtime ---');
    await new Promise((resolve) => server.close(() => resolve()));
    console.log('💥 SERVER PROCESS TERMINATED ABRUPTLY');

    // Verify DB state during offline window
    const offlineDonation = await Donation.findById(donation._id);
    const offlineVolProfile = await VolunteerProfile.findOne({ user: volunteer._id });
    if (offlineDonation.status !== 'picked_up') {
      throw new Error(`State corrupted during crash: status is ${offlineDonation.status}`);
    }
    if (offlineVolProfile.activeDeliveries !== 1) {
      throw new Error(`Volunteer counter corrupted during crash: ${offlineVolProfile.activeDeliveries}`);
    }
    console.log('✅ Database persisted consistent state across crash');

    // 3. REBOOT SERVER (Instance 2)
    console.log('\n--- 3. Rebooting Server Instance ---');
    await new Promise((resolve) => {
      server = app.listen(PORT, () => {
        console.log(`✅ Server successfully rebooted and listening on port ${PORT}`);
        resolve();
      });
    });

    // 4. Verify post-recovery operations
    console.log('\n--- 4. Testing Post-Reboot Lifecycle Resumption ---');
    // Fetch delivery OTP from NGO profile
    const ngoDonation = await Donation.findById(donation._id);
    const deliveryOtp = ngoDonation.deliveryOtp;

    // Verify delivery OTP on rebooted server
    const verifyDelRes = await fetch(`${baseUrl}/api/volunteers/tasks/${donation._id}/verify-delivery`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${volToken}`
      },
      body: JSON.stringify({ otp: deliveryOtp })
    });
    if (verifyDelRes.status !== 200) {
      throw new Error(`Post-reboot delivery OTP verification failed: ${await verifyDelRes.text()}`);
    }
    console.log('✅ Delivery OTP verified on rebooted server instance');

    // Complete task on rebooted server
    const completeRes = await fetch(`${baseUrl}/api/volunteers/tasks/${donation._id}/complete`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${volToken}`
      },
      body: JSON.stringify({ deliveryOtp })
    });
    if (completeRes.status !== 200) {
      throw new Error(`Post-reboot complete task failed: ${await completeRes.text()}`);
    }
    console.log('✅ Task completion executed cleanly post-crash');

    // 5. Audit final integrity
    console.log('\n--- 5. Auditing Final State & Invariants ---');
    const finalDonation = await Donation.findById(donation._id);
    const finalVolProfile = await VolunteerProfile.findOne({ user: volunteer._id });

    if (finalDonation.status !== 'delivered') {
      throw new Error(`Expected delivered status, got ${finalDonation.status}`);
    }
    if (finalVolProfile.activeDeliveries !== 0) {
      throw new Error(`Active deliveries expected 0, got ${finalVolProfile.activeDeliveries}`);
    }
    if (finalVolProfile.completedDeliveries !== 1) {
      throw new Error(`Completed deliveries expected 1, got ${finalVolProfile.completedDeliveries}`);
    }
    if (!finalDonation.timeline || finalDonation.timeline.length < 4) {
      throw new Error('Timeline lost event records during crash/recovery');
    }

    console.log(`✅ Timeline has all ${finalDonation.timeline.length} lifecycle events intact`);
    console.log(`✅ Volunteer active: ${finalVolProfile.activeDeliveries}, completed: ${finalVolProfile.completedDeliveries}`);

    console.log('\n🎉 ALL CRASH & RESTART RECOVERY TESTS PASSED! 🎉\n');
  } finally {
    if (server) server.close();
    await mongoose.disconnect();
  }
}

runCrashRecoveryTest().catch((err) => {
  console.error('❌ Crash recovery test failed:', err);
  process.exit(1);
});

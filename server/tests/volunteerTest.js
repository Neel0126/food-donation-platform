const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const User = require('../models/User');
const Donation = require('../models/Donation');
const NgoProfile = require('../models/NgoProfile');
const VolunteerProfile = require('../models/VolunteerProfile');
const app = require('../app');
const http = require('http');

const PORT = 5002;
let server;
let baseUrl = `http://localhost:${PORT}`;

async function runTests() {
  console.log('--- STARTING VOLUNTEER MODULE TEST SUITE ---');

  try {
    // 1. Connect DB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/food-donation');
    console.log('✅ Connected to MongoDB');

    // Start server
    await new Promise((resolve) => {
      server = app.listen(PORT, () => {
        console.log(`✅ Test server running on port ${PORT}`);
        resolve();
      });
    });

    const timestamp = Date.now();
    const donorEmail = `donor_${timestamp}@test.com`;
    const ngoEmail = `ngo_${timestamp}@test.com`;
    const volunteerEmail = `vol_${timestamp}@test.com`;

    // 2. Register Volunteer
    console.log('\n--- 1. Testing Volunteer Registration & Profile ---');
    const volRegRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Alex Volunteer',
        email: volunteerEmail,
        password: 'password123',
        phone: '9876543210',
        role: 'volunteer',
        address: '123 Volunteer St, City',
        vehicleType: 'bike',
        vehicleNumber: 'MH-01-AB-1234'
      })
    });

    const volData = await volRegRes.json();
    if (volRegRes.status !== 201) throw new Error(`Volunteer Reg failed: ${JSON.stringify(volData)}`);
    console.log('✅ Volunteer registered successfully with profile initialized');
    const volToken = volData.token;

    // 3. Fetch Volunteer Profile
    const profileRes = await fetch(`${baseUrl}/api/volunteers/profile`, {
      headers: { Authorization: `Bearer ${volToken}` }
    });
    const profileData = await profileRes.json();
    if (profileRes.status !== 200 || profileData.profile.vehicleType !== 'bike') {
      throw new Error(`Volunteer Profile fetch failed: ${JSON.stringify(profileData)}`);
    }
    console.log('✅ Volunteer Profile fetched:', profileData.profile.vehicleType, profileData.profile.availabilityStatus);

    // 4. Update Volunteer Profile
    const updateProfRes = await fetch(`${baseUrl}/api/volunteers/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${volToken}`
      },
      body: JSON.stringify({
        vehicleType: 'car',
        vehicleNumber: 'MH-01-XY-9999',
        emergencyContact: {
          name: 'Jane Doe',
          phone: '9998887776',
          relationship: 'Sister'
        }
      })
    });
    const updatedProfData = await updateProfRes.json();
    if (updateProfRes.status !== 200 || updatedProfData.profile.vehicleType !== 'car') {
      throw new Error(`Profile update failed: ${JSON.stringify(updatedProfData)}`);
    }
    console.log('✅ Volunteer Profile updated vehicle to car & added emergency contact');

    // 5. Update Status
    const statusRes = await fetch(`${baseUrl}/api/volunteers/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${volToken}`
      },
      body: JSON.stringify({ availabilityStatus: 'available' })
    });
    const statusData = await statusRes.json();
    if (statusRes.status !== 200) throw new Error(`Status update failed: ${JSON.stringify(statusData)}`);
    console.log('✅ Availability status toggled successfully');

    // 6. Setup Donor and NGO
    console.log('\n--- 2. Setting up Donor & NGO for Donation Lifecycle ---');
    const donorRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'John Donor',
        email: donorEmail,
        password: 'password123',
        phone: '9123456780',
        role: 'donor',
        address: '456 Donor Ave, Downtown'
      })
    });
    const donorData = await donorRes.json();
    const donorToken = donorData.token;
    console.log('✅ Donor registered');

    const ngoRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Helping NGO Leader',
        email: ngoEmail,
        password: 'password123',
        phone: '9888877776',
        role: 'ngo',
        organizationName: 'Helping Hands Foundation',
        registrationNumber: `REG-${timestamp}`,
        address: '789 NGO Blvd, Uptown'
      })
    });
    const ngoData = await ngoRes.json();
    const ngoToken = ngoData.token;

    // Approve NGO verification for testing
    await NgoProfile.updateOne({ user: ngoData.user.id }, { verificationStatus: 'approved' });
    console.log('✅ NGO registered & verified');

    // 7. Donor creates Donation
    const donationCreateRes = await fetch(`${baseUrl}/api/donations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${donorToken}`
      },
      body: JSON.stringify({
        foodType: 'Cooked Meals',
        quantity: '40 plates',
        description: 'Fresh lunch packets prepared today',
        pickupLocation: {
          street: '456 Donor Ave',
          city: 'Mumbai',
          state: 'Maharashtra',
          zipCode: '400001'
        }
      })
    });
    const donationData = await donationCreateRes.json();
    if (donationCreateRes.status !== 201) throw new Error(`Create donation failed: ${JSON.stringify(donationData)}`);
    console.log('✅ Donor created donation #', donationData._id);
    const donationId = donationData._id;

    // 8. NGO Accepts donation and requests volunteer
    const ngoAcceptRes = await fetch(`${baseUrl}/api/ngos/donations/${donationId}/accept`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${ngoToken}` }
    });
    const ngoAcceptData = await ngoAcceptRes.json();
    if (ngoAcceptRes.status !== 200) throw new Error(`NGO accept failed: ${JSON.stringify(ngoAcceptData)}`);
    console.log('✅ NGO accepted donation');

    const reqVolRes = await fetch(`${baseUrl}/api/ngos/donations/${donationId}/request-volunteer`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${ngoToken}` }
    });
    const reqVolData = await reqVolRes.json();
    if (reqVolRes.status !== 200) throw new Error(`Request volunteer failed: ${JSON.stringify(reqVolData)}`);
    console.log('✅ NGO requested volunteer for donation');

    // 9. Volunteer Browses Available Tasks
    console.log('\n--- 3. Testing Volunteer Task Browsing, Accept, & Reject ---');
    const availTasksRes = await fetch(`${baseUrl}/api/volunteers/tasks/available`, {
      headers: { Authorization: `Bearer ${volToken}` }
    });
    const availTasks = await availTasksRes.json();
    if (availTasksRes.status !== 200 || !availTasks.some(t => t._id === donationId)) {
      throw new Error(`Available tasks list does not contain donation: ${JSON.stringify(availTasks)}`);
    }
    console.log(`✅ Volunteer sees available task in pool (Total available: ${availTasks.length})`);

    // Verify OTPs are hidden from volunteer query
    if (availTasks[0].pickupOtp || availTasks[0].deliveryOtp) {
      throw new Error('Security violation: OTPs are exposed in volunteer task query!');
    }
    console.log('✅ Verified: OTPs are securely hidden from volunteer task listing');

    // 10. Test Accept Task
    const acceptTaskRes = await fetch(`${baseUrl}/api/volunteers/tasks/${donationId}/accept`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${volToken}` }
    });
    const acceptTaskData = await acceptTaskRes.json();
    if (acceptTaskRes.status !== 200) throw new Error(`Accept task failed: ${JSON.stringify(acceptTaskData)}`);
    console.log('✅ Volunteer accepted task successfully. Status:', acceptTaskData.task.status);

    // 11. Test Reject Task (re-pools the task)
    const rejectRes = await fetch(`${baseUrl}/api/volunteers/tasks/${donationId}/reject`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${volToken}` }
    });
    const rejectData = await rejectRes.json();
    if (rejectRes.status !== 200) throw new Error(`Reject task failed: ${JSON.stringify(rejectData)}`);
    console.log('✅ Volunteer rejected task, successfully released back to pool');

    // Re-accept task to continue delivery flow
    await fetch(`${baseUrl}/api/volunteers/tasks/${donationId}/accept`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${volToken}` }
    });
    console.log('✅ Volunteer re-accepted task for delivery');

    // 12. Pickup OTP verification
    console.log('\n--- 4. Testing Pickup OTP Verification ---');
    // Donor gets donation to see the pickup OTP
    const donorDonationRes = await fetch(`${baseUrl}/api/donations/${donationId}`, {
      headers: { Authorization: `Bearer ${donorToken}` }
    });
    const donorDonation = await donorDonationRes.json();
    const pickupOtp = donorDonation.pickupOtp;
    if (!pickupOtp) throw new Error('Donor donation does not have pickup OTP!');
    console.log(`✅ Donor has pickup OTP: ${pickupOtp}`);

    // Try invalid OTP first
    const invalidPickupRes = await fetch(`${baseUrl}/api/volunteers/tasks/${donationId}/verify-pickup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${volToken}`
      },
      body: JSON.stringify({ otp: '000000' })
    });
    if (invalidPickupRes.status !== 400) {
      throw new Error('Invalid OTP did not return 400!');
    }
    console.log('✅ Invalid pickup OTP was properly rejected (400)');

    // Submit correct pickup OTP
    const validPickupRes = await fetch(`${baseUrl}/api/volunteers/tasks/${donationId}/verify-pickup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${volToken}`
      },
      body: JSON.stringify({ otp: pickupOtp })
    });
    const validPickupData = await validPickupRes.json();
    if (validPickupRes.status !== 200 || validPickupData.task.status !== 'picked_up') {
      throw new Error(`Valid pickup OTP verification failed: ${JSON.stringify(validPickupData)}`);
    }
    console.log('✅ Valid pickup OTP verified! Task status is now:', validPickupData.task.status);

    // 13. Delivery Proof Upload / Notes
    console.log('\n--- 5. Testing Delivery Proof & Delivery OTP ---');
    const proofRes = await fetch(`${baseUrl}/api/volunteers/tasks/${donationId}/delivery-proof`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${volToken}`
      },
      body: JSON.stringify({
        deliveryNotes: 'Delivered directly to the NGO pantry coordinator, all packages in good condition.'
      })
    });
    const proofData = await proofRes.json();
    if (proofRes.status !== 200) throw new Error(`Proof upload failed: ${JSON.stringify(proofData)}`);
    console.log('✅ Delivery notes and proof recorded:', proofData.task.deliveryNotes);

    // NGO gets donation to see delivery OTP
    const ngoDonationsRes = await fetch(`${baseUrl}/api/ngos/my-donations`, {
      headers: { Authorization: `Bearer ${ngoToken}` }
    });
    const ngoDonations = await ngoDonationsRes.json();
    const currentNgoDonation = ngoDonations.find(d => d._id === donationId);
    const deliveryOtp = currentNgoDonation.deliveryOtp;
    if (!deliveryOtp) throw new Error('NGO donation does not have delivery OTP!');
    console.log(`✅ NGO has delivery OTP: ${deliveryOtp}`);

    // Verify delivery OTP
    const invalidDeliveryRes = await fetch(`${baseUrl}/api/volunteers/tasks/${donationId}/verify-delivery`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${volToken}`
      },
      body: JSON.stringify({ otp: '999999' })
    });
    if (invalidDeliveryRes.status !== 400) {
      throw new Error('Invalid delivery OTP did not return 400!');
    }
    console.log('✅ Invalid delivery OTP properly rejected (400)');

    const validDeliveryRes = await fetch(`${baseUrl}/api/volunteers/tasks/${donationId}/verify-delivery`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${volToken}`
      },
      body: JSON.stringify({ otp: deliveryOtp })
    });
    const validDeliveryData = await validDeliveryRes.json();
    if (validDeliveryRes.status !== 200) {
      throw new Error(`Delivery OTP verification failed: ${JSON.stringify(validDeliveryData)}`);
    }
    console.log('✅ Valid delivery OTP verified successfully!');

    // 14. Complete Task
    console.log('\n--- 6. Testing Complete Task & Volunteer Stats ---');
    const completeRes = await fetch(`${baseUrl}/api/volunteers/tasks/${donationId}/complete`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${volToken}`
      },
      body: JSON.stringify({
        deliveryNotes: 'All 40 plates handed over successfully.'
      })
    });
    const completeData = await completeRes.json();
    if (completeRes.status !== 200 || completeData.task.status !== 'delivered') {
      throw new Error(`Complete task failed: ${JSON.stringify(completeData)}`);
    }
    console.log('✅ Delivery task completed! Final status:', completeData.task.status);
    console.log('✅ Volunteer stats after completion:', completeData.volunteerStats);

    // 15. Check Volunteer Stats Endpoint
    const statsRes = await fetch(`${baseUrl}/api/volunteers/stats`, {
      headers: { Authorization: `Bearer ${volToken}` }
    });
    const statsData = await statsRes.json();
    if (statsRes.status !== 200 || statsData.stats.completedDeliveries < 1) {
      throw new Error(`Stats endpoint failed: ${JSON.stringify(statsData)}`);
    }
    console.log('✅ Volunteer stats endpoint verified:', statsData.stats);

    console.log('\n🎉 ALL VOLUNTEER MODULE TESTS PASSED SUCCESSFULLY! 🎉\n');
  } catch (err) {
    console.error('❌ Test error:', err);
    process.exitCode = 1;
  } finally {
    if (server) server.close();
    await mongoose.disconnect();
  }
}

runTests();

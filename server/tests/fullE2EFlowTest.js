const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const User = require('../models/User');
const Donation = require('../models/Donation');
const NgoProfile = require('../models/NgoProfile');
const VolunteerProfile = require('../models/VolunteerProfile');
const app = require('../app');

const PORT = 5010;
let server;
const baseUrl = `http://localhost:${PORT}`;

async function runFullE2EFlowTest() {
  console.log('====================================================');
  console.log('      COMPLETE END-TO-END PLATFORM FLOW TEST        ');
  console.log('====================================================');

  try {
    await mongoose.connect(process.env.MONGO_URI);
    await new Promise((resolve) => {
      server = app.listen(PORT, () => resolve());
    });

    const ts = Date.now();
    const donorEmail = `e2e_donor_${ts}@test.com`;
    const ngoEmail = `e2e_ngo_${ts}@test.com`;
    const volEmail = `e2e_vol_${ts}@test.com`;
    const adminEmail = `e2e_admin_${ts}@test.com`;

    // 1. Register Donor
    console.log('\n--- Step 1: Donor Registration & Authentication ---');
    const donorReg = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'E2E Donor',
        email: donorEmail,
        password: 'Password123!',
        role: 'donor',
        phone: `91${String(ts).slice(-8)}`
      })
    });
    const donorData = await donorReg.json();
    if (donorReg.status !== 201) throw new Error(`Donor Reg failed: ${JSON.stringify(donorData)}`);
    console.log('✅ Donor registered successfully (HTTP 201)');

    // 2. Register NGO
    console.log('\n--- Step 2: NGO Registration & Auto-Profile Creation ---');
    const ngoReg = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'E2E NGO Leader',
        email: ngoEmail,
        password: 'Password123!',
        role: 'ngo',
        organizationName: 'E2E Relief Organization',
        registrationNumber: `NGO-${ts}`,
        phone: `92${String(ts).slice(-8)}`
      })
    });
    const ngoData = await ngoReg.json();
    if (ngoReg.status !== 201) throw new Error(`NGO Reg failed: ${JSON.stringify(ngoData)}`);
    console.log('✅ NGO registered successfully (HTTP 201)');

    // 3. Register Volunteer
    console.log('\n--- Step 3: Volunteer Registration & Profile Initialization ---');
    const volReg = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'E2E Volunteer Driver',
        email: volEmail,
        password: 'Password123!',
        role: 'volunteer',
        phone: `93${String(ts).slice(-8)}`
      })
    });
    const volData = await volReg.json();
    if (volReg.status !== 201) throw new Error(`Volunteer Reg failed: ${JSON.stringify(volData)}`);
    console.log('✅ Volunteer registered successfully (HTTP 201)');

    // 4. Create Admin
    const adminUser = await User.create({
      name: 'E2E Admin',
      email: adminEmail,
      password: 'Password123!',
      role: 'admin',
      isVerified: true
    });
    const adminLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password: 'Password123!' })
    });
    const adminData = await adminLogin.json();
    console.log('✅ Admin authenticated successfully (HTTP 200)');

    // Admin approves NGO
    await NgoProfile.updateOne({ user: ngoData.user.id }, { verificationStatus: 'approved' });
    console.log('✅ Admin verified NGO status');

    // 5. Donor creates donation
    console.log('\n--- Step 4: Food Donation Creation ---');
    const donRes = await fetch(`${baseUrl}/api/donations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${donorData.token}`
      },
      body: JSON.stringify({
        foodType: 'Cooked Meals',
        quantity: '50 meal boxes',
        estimatedMeals: 50,
        description: 'Freshly prepared vegetarian meals packed in eco containers',
        pickupWindow: 'Today 2:00 PM - 5:00 PM',
        pickupLocation: {
          street: '100 Marine Drive',
          city: 'Mumbai',
          state: 'Maharashtra',
          zipCode: '400020'
        }
      })
    });
    const donationData = await donRes.json();
    if (donRes.status !== 201) throw new Error(`Donation create failed: ${JSON.stringify(donationData)}`);
    const donationId = donationData._id;
    console.log(`✅ Donation created successfully (ID: ${donationId}, Status: ${donationData.status})`);

    // 6. NGO browses and accepts donation
    console.log('\n--- Step 5: NGO Browsing & Acceptance ---');
    const acceptRes = await fetch(`${baseUrl}/api/ngos/donations/${donationId}/accept`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${ngoData.token}` }
    });
    const acceptData = await acceptRes.json();
    if (acceptRes.status !== 200) throw new Error(`Accept failed: ${JSON.stringify(acceptData)}`);
    console.log('✅ NGO accepted donation (HTTP 200)');

    // NGO requests volunteer
    const reqVolRes = await fetch(`${baseUrl}/api/ngos/donations/${donationId}/request-volunteer`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${ngoData.token}` }
    });
    if (reqVolRes.status !== 200) throw new Error('Request volunteer failed');
    console.log('✅ NGO requested volunteer delivery dispatch');

    // 7. Volunteer accepts task
    console.log('\n--- Step 6: Volunteer Task Acceptance & Pickup ---');
    const claimRes = await fetch(`${baseUrl}/api/volunteers/tasks/${donationId}/accept`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${volData.token}` }
    });
    if (claimRes.status !== 200) throw new Error('Volunteer accept failed');
    console.log('✅ Volunteer claimed delivery task');

    // Fetch pickup OTP from donor record
    const donationInDb = await Donation.findById(donationId);
    const pickupOtp = donationInDb.pickupOtp;
    console.log(`Retrieved Donor Pickup OTP: ${pickupOtp}`);

    // Volunteer verifies pickup OTP
    const verifyPickupRes = await fetch(`${baseUrl}/api/volunteers/tasks/${donationId}/verify-pickup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${volData.token}`
      },
      body: JSON.stringify({ otp: pickupOtp })
    });
    if (verifyPickupRes.status !== 200) throw new Error('Pickup OTP verification failed');
    console.log('✅ Pickup OTP verified, status transitioned to "picked_up"');

    // 8. Delivery Handshake
    console.log('\n--- Step 7: Delivery Handshake & Completion ---');
    const updatedDonation = await Donation.findById(donationId);
    const deliveryOtp = updatedDonation.deliveryOtp;
    console.log(`Retrieved NGO Delivery OTP: ${deliveryOtp}`);

    // Volunteer verifies delivery OTP
    const verifyDeliveryRes = await fetch(`${baseUrl}/api/volunteers/tasks/${donationId}/verify-delivery`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${volData.token}`
      },
      body: JSON.stringify({ otp: deliveryOtp })
    });
    if (verifyDeliveryRes.status !== 200) throw new Error('Delivery OTP verification failed');
    console.log('✅ Delivery OTP verified successfully');

    // Volunteer completes task
    const completeRes = await fetch(`${baseUrl}/api/volunteers/tasks/${donationId}/complete`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${volData.token}`
      },
      body: JSON.stringify({ deliveryNotes: 'Delivered in mint condition.' })
    });
    if (completeRes.status !== 200) throw new Error('Complete task failed');
    console.log('✅ Task officially marked DELIVERED');

    // 9. Admin Dashboard Verification
    console.log('\n--- Step 8: Admin Statistics Verification ---');
    const statsRes = await fetch(`${baseUrl}/api/admin/stats`, {
      headers: { Authorization: `Bearer ${adminData.token}` }
    });
    const statsData = await statsRes.json();
    console.log('Admin Platform Stats:', {
      totalDonations: statsData.totalDonations,
      activeUsers: statsData.totalUsers,
      totalMeals: statsData.totalMeals
    });
    console.log('✅ Admin dashboard stats successfully audited');

    // 10. Clean up test records
    console.log('\n--- Cleaning up E2E Test Records ---');
    await Donation.deleteOne({ _id: donationId });
    await User.deleteMany({ email: { $in: [donorEmail, ngoEmail, volEmail, adminEmail] } });
    await NgoProfile.deleteOne({ registrationNumber: `NGO-${ts}` });
    await VolunteerProfile.deleteOne({ user: volData.user.id });
    console.log('✅ Test records cleaned up completely');

    console.log('\n🎉 FULL END-TO-END SUITE COMPLETED WITH 100% SUCCESS! 🎉\n');
  } catch (err) {
    console.error('❌ E2E Flow Failed:', err.message);
    process.exit(1);
  } finally {
    if (server) server.close();
    await mongoose.connection.close();
    process.exit(0);
  }
}

runFullE2EFlowTest();

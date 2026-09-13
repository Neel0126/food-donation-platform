const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const User = require('../models/User');
const Donation = require('../models/Donation');
const NgoProfile = require('../models/NgoProfile');
const VolunteerProfile = require('../models/VolunteerProfile');
const app = require('../app');

const PORT = 5003;
let server;
let baseUrl = `http://localhost:${PORT}`;

async function runDirectAssignTest() {
  console.log('--- TESTING DIRECT VOLUNTEER ASSIGNMENT BY NGO ---');
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/food-donation');
    await new Promise((resolve) => {
      server = app.listen(PORT, () => {
        resolve();
      });
    });

    const timestamp = Date.now();
    // Register volunteer
    const volRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Direct Assign Volunteer',
        email: `direct_vol_${timestamp}@test.com`,
        password: 'password123',
        role: 'volunteer'
      })
    });
    const volData = await volRes.json();
    const volId = volData.user.id;
    const volToken = volData.token;

    // Register donor
    const donorRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Direct Donor',
        email: `direct_donor_${timestamp}@test.com`,
        password: 'password123',
        role: 'donor'
      })
    });
    const donorData = await donorRes.json();
    const donorToken = donorData.token;

    // Register NGO
    const ngoRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Direct NGO',
        email: `direct_ngo_${timestamp}@test.com`,
        password: 'password123',
        role: 'ngo',
        organizationName: 'Direct NGO Org',
        registrationNumber: `REG-DIR-${timestamp}`
      })
    });
    const ngoData = await ngoRes.json();
    const ngoToken = ngoData.token;
    await NgoProfile.updateOne({ user: ngoData.user.id }, { verificationStatus: 'approved' });

    // Donor creates donation
    const donCreate = await fetch(`${baseUrl}/api/donations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${donorToken}`
      },
      body: JSON.stringify({
        foodType: 'Packed Sandwiches',
        quantity: '25 boxes',
        pickupLocation: { street: '100 Main St', city: 'Delhi' }
      })
    });
    const donData = await donCreate.json();

    // NGO accepts
    await fetch(`${baseUrl}/api/ngos/donations/${donData._id}/accept`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${ngoToken}` }
    });

    // NGO queries available volunteers
    const availVolRes = await fetch(`${baseUrl}/api/ngos/volunteers/available`, {
      headers: { Authorization: `Bearer ${ngoToken}` }
    });
    const availVols = await availVolRes.json();
    if (!availVols.some(v => v.user._id.toString() === volId)) {
      throw new Error('Available volunteers list did not contain newly created volunteer');
    }
    console.log('✅ NGO fetched available volunteers successfully');

    // NGO assigns volunteer directly
    const assignRes = await fetch(`${baseUrl}/api/ngos/donations/${donData._id}/assign-volunteer`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ngoToken}`
      },
      body: JSON.stringify({ volunteerId: volId })
    });
    const assignData = await assignRes.json();
    if (assignRes.status !== 200 || assignData.donation.assignedVolunteer !== volId) {
      throw new Error(`Direct assignment failed: ${JSON.stringify(assignData)}`);
    }
    console.log('✅ NGO directly assigned task to volunteer');

    // Volunteer views assigned task
    const myTasksRes = await fetch(`${baseUrl}/api/volunteers/tasks/my-tasks`, {
      headers: { Authorization: `Bearer ${volToken}` }
    });
    const myTasks = await myTasksRes.json();
    if (!myTasks.some(t => t._id === donData._id)) {
      throw new Error('Assigned task not found in volunteer tasks');
    }
    console.log('✅ Volunteer received directly assigned task in my-tasks');

    console.log('🎉 DIRECT ASSIGNMENT TEST PASSED! 🎉');
  } catch (err) {
    console.error('❌ Direct assign test error:', err);
    process.exitCode = 1;
  } finally {
    if (server) server.close();
    await mongoose.disconnect();
  }
}

runDirectAssignTest();

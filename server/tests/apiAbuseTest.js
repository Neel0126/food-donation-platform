const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const User = require('../models/User');
const Donation = require('../models/Donation');
const NgoProfile = require('../models/NgoProfile');
const app = require('../app');

const PORT = 5007;
let server;
const baseUrl = `http://localhost:${PORT}`;

async function runApiAbuseTest() {
  console.log('====================================================');
  console.log('       TEST 4: API ABUSE & DIRECT ATTACK AUDIT      ');
  console.log('====================================================');

  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/food-donation');
    await new Promise((resolve) => {
      server = app.listen(PORT, () => resolve());
    });

    const ts = Date.now();

    // Create Donor A & Donor B
    const donorA = await User.create({
      name: 'Donor A',
      email: `donorA_${ts}@test.com`,
      password: 'password123',
      role: 'donor'
    });
    const tokenDonorA = jwt.sign({ id: donorA._id }, process.env.JWT_SECRET || 'secret');

    const donorB = await User.create({
      name: 'Donor B',
      email: `donorB_${ts}@test.com`,
      password: 'password123',
      role: 'donor'
    });
    const tokenDonorB = jwt.sign({ id: donorB._id }, process.env.JWT_SECRET || 'secret');

    // Create NGO A & NGO B
    const ngoA = await User.create({
      name: 'NGO A',
      email: `ngoA_${ts}@test.com`,
      password: 'password123',
      role: 'ngo',
      isVerified: true
    });
    await NgoProfile.create({
      user: ngoA._id,
      organizationName: 'NGO Org A',
      registrationNumber: `REG-A-${ts}`,
      verificationStatus: 'approved'
    });
    const tokenNgoA = jwt.sign({ id: ngoA._id }, process.env.JWT_SECRET || 'secret');

    const ngoB = await User.create({
      name: 'NGO B',
      email: `ngoB_${ts}@test.com`,
      password: 'password123',
      role: 'ngo',
      isVerified: true
    });
    await NgoProfile.create({
      user: ngoB._id,
      organizationName: 'NGO Org B',
      registrationNumber: `REG-B-${ts}`,
      verificationStatus: 'approved'
    });
    const tokenNgoB = jwt.sign({ id: ngoB._id }, process.env.JWT_SECRET || 'secret');

    // Create Volunteer
    const volunteer = await User.create({
      name: 'Vol Attacker',
      email: `vol_${ts}@test.com`,
      password: 'password123',
      role: 'volunteer',
      isVerified: true
    });
    const tokenVol = jwt.sign({ id: volunteer._id }, process.env.JWT_SECRET || 'secret');

    // Create Admin
    const admin = await User.create({
      name: 'Admin User',
      email: `admin_${ts}@test.com`,
      password: 'password123',
      role: 'admin',
      isVerified: true
    });
    const tokenAdmin = jwt.sign({ id: admin._id }, process.env.JWT_SECRET || 'secret');

    // Donor A creates a donation
    const donationA = await Donation.create({
      donor: donorA._id,
      foodType: 'Apples & Bananas',
      quantity: '40 kg',
      pickupLocation: { street: '12 Harvest St', city: 'Metro' },
      status: 'pending'
    });

    // ─────────────────────────────────────────────────────────────
    // 1. Missing, Expired, and Malformed Tokens
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 1. Testing Unauthenticated & Invalid Token Access ---');
    // No token
    const noTokRes = await fetch(`${baseUrl}/api/donations`);
    if (noTokRes.status !== 401) throw new Error(`Expected 401 for no token, got ${noTokRes.status}`);
    console.log('✅ No token request rejected (401)');

    // Malformed token
    const malTokRes = await fetch(`${baseUrl}/api/donations`, {
      headers: { Authorization: 'Bearer totally_garbage_not_a_jwt' }
    });
    if (malTokRes.status !== 401) throw new Error(`Expected 401 for garbage token, got ${malTokRes.status}`);
    console.log('✅ Malformed token rejected (401)');

    // ─────────────────────────────────────────────────────────────
    // 2. Cross-Role Matrix (Role Boundary Enforcement)
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 2. Testing Cross-Role Privilege Enforcement ---');
    // Donor attempting NGO accept endpoint
    const donorAcceptRes = await fetch(`${baseUrl}/api/ngos/donations/${donationA._id}/accept`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tokenDonorA}` }
    });
    if (donorAcceptRes.status !== 403) throw new Error(`Expected 403 for donor on NGO endpoint, got ${donorAcceptRes.status}`);
    console.log('✅ Donor blocked from NGO endpoint (403)');

    // Volunteer attempting Donor create endpoint
    const volCreateRes = await fetch(`${baseUrl}/api/donations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenVol}`
      },
      body: JSON.stringify({ foodType: 'Illegal Food' })
    });
    if (volCreateRes.status !== 403) throw new Error(`Expected 403 for volunteer on donor endpoint, got ${volCreateRes.status}`);
    console.log('✅ Volunteer blocked from donor donation creation (403)');

    // NGO attempting Admin user management endpoint
    const ngoAdminRes = await fetch(`${baseUrl}/api/admin/users`, {
      headers: { Authorization: `Bearer ${tokenNgoA}` }
    });
    if (ngoAdminRes.status !== 403) throw new Error(`Expected 403 for NGO on admin endpoint, got ${ngoAdminRes.status}`);
    console.log('✅ NGO blocked from admin dashboard (403)');

    // ─────────────────────────────────────────────────────────────
    // 3. Insecure Direct Object References (IDOR)
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 3. Testing Insecure Direct Object References (IDOR) ---');
    // Donor B attempting to edit Donor A's donation
    const idorEditRes = await fetch(`${baseUrl}/api/donations/${donationA._id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenDonorB}`
      },
      body: JSON.stringify({ foodType: 'Hijacked Food' })
    });
    if (idorEditRes.status !== 403) throw new Error(`Expected 403 for IDOR donation edit, got ${idorEditRes.status}`);
    console.log('✅ Cross-tenant donation edit blocked (403)');

    // Donor B attempting to regenerate Donor A's pickup OTP
    const idorOtpRes = await fetch(`${baseUrl}/api/donations/${donationA._id}/regenerate-pickup-otp`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tokenDonorB}` }
    });
    if (idorOtpRes.status !== 404 && idorOtpRes.status !== 403) {
      throw new Error(`Expected 404/403 for unauthorized pickup OTP regen, got ${idorOtpRes.status}`);
    }
    console.log('✅ Cross-tenant pickup OTP regeneration blocked');

    // NGO A accepts donation
    await fetch(`${baseUrl}/api/ngos/donations/${donationA._id}/accept`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tokenNgoA}` }
    });

    // NGO B attempting to release NGO A's accepted donation
    const idorReleaseRes = await fetch(`${baseUrl}/api/ngos/donations/${donationA._id}/release`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tokenNgoB}` }
    });
    if (idorReleaseRes.status !== 404 && idorReleaseRes.status !== 403) {
      throw new Error(`Expected 404/403 for unauthorized donation release, got ${idorReleaseRes.status}`);
    }
    console.log('✅ Cross-tenant donation release blocked');

    // NGO B attempting to regenerate NGO A's delivery OTP
    const idorDelOtpRes = await fetch(`${baseUrl}/api/ngos/donations/${donationA._id}/regenerate-delivery-otp`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tokenNgoB}` }
    });
    if (idorDelOtpRes.status !== 404 && idorDelOtpRes.status !== 403) {
      throw new Error(`Expected 404/403 for unauthorized delivery OTP regen, got ${idorDelOtpRes.status}`);
    }
    console.log('✅ Cross-tenant delivery OTP regeneration blocked');

    // ─────────────────────────────────────────────────────────────
    // 4. Admin Self-Harm Protection
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 4. Testing Admin Self-Protection Safeguards ---');
    // Admin trying to delete their own account
    const selfDelRes = await fetch(`${baseUrl}/api/admin/users/${admin._id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenAdmin}` }
    });
    if (selfDelRes.status !== 400) throw new Error(`Expected 400 for admin self-deletion, got ${selfDelRes.status}`);
    console.log('✅ Admin self-deletion prevented (400)');

    // Admin trying to demote their own account
    const selfDemoteRes = await fetch(`${baseUrl}/api/admin/users/${admin._id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenAdmin}`
      },
      body: JSON.stringify({ role: 'donor' })
    });
    if (selfDemoteRes.status !== 400) throw new Error(`Expected 400 for admin self-modification, got ${selfDemoteRes.status}`);
    console.log('✅ Admin self-demotion prevented (400)');

    // ─────────────────────────────────────────────────────────────
    // 5. Malformed Resource Identifiers
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 5. Testing Malformed ObjectId Fuzzing ---');
    const malformedIds = ['invalid-id-string', '12345', '<script>alert(1)</script>', 'undefined'];
    for (const badId of malformedIds) {
      const malRes = await fetch(`${baseUrl}/api/donations/${badId}/cancel`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${tokenDonorA}` }
      });
      if (malRes.status !== 400 && malRes.status !== 404) {
        throw new Error(`Expected 400/404 for malformed ID "${badId}", got ${malRes.status}`);
      }
    }
    console.log('✅ All malformed ObjectIds intercepted and rejected cleanly with 400 (no 500 crash)');

    // ─────────────────────────────────────────────────────────────
    // 6. Massive Payload Rejection (DoS protection)
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 6. Testing Large Payload Exhaustion ---');
    const hugeBody = JSON.stringify({
      foodType: 'Massive Payload Test',
      giantBlob: 'A'.repeat(2 * 1024 * 1024) // 2MB payload
    });

    const hugeRes = await fetch(`${baseUrl}/api/donations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenDonorA}`
      },
      body: hugeBody
    });
    if (hugeRes.status !== 413) throw new Error(`Expected 413 Payload Too Large, got ${hugeRes.status}`);
    console.log('✅ Huge request payload (>1MB) safely rejected with 413 Payload Too Large');

    console.log('\n🎉 ALL API ABUSE & DIRECT ATTACK TESTS PASSED! 🎉\n');
  } finally {
    if (server) server.close();
    await mongoose.disconnect();
  }
}

runApiAbuseTest().catch((err) => {
  console.error('❌ API abuse test failed:', err);
  process.exit(1);
});

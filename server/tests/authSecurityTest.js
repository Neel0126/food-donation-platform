const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const User = require('../models/User');
const NgoProfile = require('../models/NgoProfile');
const app = require('../app');

const PORT = 5004;
let server;
const baseUrl = `http://localhost:${PORT}`;

async function runAuthSecurityTests() {
  console.log('====================================================');
  console.log('   TEST 1: AUTHENTICATION & ACCESS SECURITY AUDIT   ');
  console.log('====================================================');

  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/food-donation');
    await new Promise((resolve) => {
      server = app.listen(PORT, () => resolve());
    });

    const ts = Date.now();
    const testEmail = `auth_sec_${ts}@test.com`;
    const testPhone = `+9198765${String(ts).slice(-5)}`;

    // 1. Register valid base user
    console.log('\n--- A. Registration Integrity Tests ---');
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Sec Test User',
        email: testEmail,
        password: 'Password123!',
        phone: testPhone,
        role: 'donor'
      })
    });
    if (regRes.status !== 201) throw new Error(`Base user registration failed: ${await regRes.text()}`);
    console.log('✅ Base user registered successfully');

    // 2. Duplicate email rejection
    const dupEmailRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Imposter User',
        email: testEmail,
        password: 'Password123!',
        phone: '+919999999999',
        role: 'donor'
      })
    });
    if (dupEmailRes.status !== 400) throw new Error(`Expected 400 for duplicate email, got ${dupEmailRes.status}`);
    console.log('✅ Duplicate email properly rejected (400)');

    // 3. Duplicate phone rejection
    const dupPhoneRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Duplicate Phone User',
        email: `unique_${ts}@test.com`,
        password: 'Password123!',
        phone: testPhone,
        role: 'donor'
      })
    });
    if (dupPhoneRes.status !== 400) throw new Error(`Expected 400 for duplicate phone, got ${dupPhoneRes.status}`);
    console.log('✅ Duplicate phone properly rejected (400)');

    // 4. Role = admin injection rejection
    const adminEscalationRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Hacker Admin',
        email: `hacker_${ts}@test.com`,
        password: 'Password123!',
        role: 'admin'
      })
    });
    if (adminEscalationRes.status !== 400) throw new Error(`Expected 400 for admin role escalation, got ${adminEscalationRes.status}`);
    console.log('✅ Privilege escalation attempt (role: admin) properly blocked (400)');

    // 5. isVerified = true injection on NGO registration
    const ngoEmail = `ngo_verify_test_${ts}@test.com`;
    const ngoRegRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Unverified NGO',
        email: ngoEmail,
        password: 'Password123!',
        role: 'ngo',
        organizationName: 'Hack NGO',
        registrationNumber: `REG-SEC-${ts}`,
        isVerified: true // Attacker tries to bypass verification
      })
    });
    const ngoData = await ngoRegRes.json();
    if (ngoData.user.isVerified === true || ngoData.user.verificationStatus === 'approved') {
      throw new Error('Security failure: Attacker self-verified NGO via mass assignment!');
    }
    console.log('✅ isVerified=true mass assignment ignored; NGO verificationStatus is pending/false');

    // 6. Arbitrary MongoDB fields injection
    const fieldLeakRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Field Injection User',
        email: `fields_${ts}@test.com`,
        password: 'Password123!',
        role: 'donor',
        arbitrarySecret: 'injected_val',
        __v: 99
      })
    });
    const leakData = await fieldLeakRes.json();
    const createdUserDoc = await User.findById(leakData.user.id);
    if (createdUserDoc.arbitrarySecret) {
      throw new Error('Security failure: Arbitrary field was saved to document!');
    }
    console.log('✅ Arbitrary MongoDB fields stripped cleanly');

    // 7. Login: Nonexistent email
    console.log('\n--- B. Login & Token Lifecycle Tests ---');
    const nonExistRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nonexistent@test.com', password: 'password123' })
    });
    if (nonExistRes.status !== 401) throw new Error(`Expected 401 for nonexistent email, got ${nonExistRes.status}`);
    console.log('✅ Nonexistent email rejected (401)');

    // 8. Repeated wrong passwords & rate limiting
    console.log('Testing 5 repeated wrong password attempts...');
    for (let i = 0; i < 5; i++) {
      const failRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail, password: 'WrongPassword!' })
      });
      if (failRes.status !== 401 && failRes.status !== 429) {
        throw new Error(`Unexpected status during login attempts: ${failRes.status}`);
      }
    }
    // 6th attempt should be blocked with 429 Too Many Requests
    const lockedRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: 'Password123!' })
    });
    if (lockedRes.status !== 429) {
      throw new Error(`Expected 429 rate limit lock after 5 failures, got ${lockedRes.status}`);
    }
    console.log('✅ Login brute-force rate limiter triggered: 6th attempt returned 429 Too Many Requests');

    // 9. Expired JWT test
    const expiredToken = jwt.sign(
      { id: createdUserDoc._id },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '-10s' }
    );
    const expRes = await fetch(`${baseUrl}/api/auth/profile`, {
      headers: { Authorization: `Bearer ${expiredToken}` }
    });
    if (expRes.status !== 401) throw new Error(`Expected 401 for expired token, got ${expRes.status}`);
    console.log('✅ Expired JWT rejected (401)');

    // 10. Modified/tampered JWT test
    const validToken = jwt.sign({ id: createdUserDoc._id }, process.env.JWT_SECRET || 'secret');
    const tamperedToken = validToken.slice(0, -6) + 'abcdef';
    const tampRes = await fetch(`${baseUrl}/api/auth/profile`, {
      headers: { Authorization: `Bearer ${tamperedToken}` }
    });
    if (tampRes.status !== 401) throw new Error(`Expected 401 for tampered signature, got ${tampRes.status}`);
    console.log('✅ Tampered/modified signature JWT rejected (401)');

    // 11. Deleted/revoked account token test
    const ghostUser = await User.create({
      name: 'Ghost User',
      email: `ghost_${ts}@test.com`,
      password: 'password123',
      role: 'donor'
    });
    const ghostToken = jwt.sign({ id: ghostUser._id }, process.env.JWT_SECRET || 'secret');
    await User.deleteOne({ _id: ghostUser._id }); // Account deleted
    const ghostRes = await fetch(`${baseUrl}/api/auth/profile`, {
      headers: { Authorization: `Bearer ${ghostToken}` }
    });
    if (ghostRes.status !== 401) throw new Error(`Expected 401 for deleted user token, got ${ghostRes.status}`);
    console.log('✅ Deleted account token safely rejected (401 User not found)');

    // 12. Password reset lifecycle
    console.log('\n--- C. Password Reset Lifecycle Tests ---');
    // Invalid reset token
    const badResetRes = await fetch(`${baseUrl}/api/auth/reset-password/totally-invalid-token-12345`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'NewPassword123!' })
    });
    if (badResetRes.status !== 400) throw new Error(`Expected 400 for invalid token, got ${badResetRes.status}`);
    console.log('✅ Invalid reset token rejected (400)');

    // Legitimate token generation & reuse test
    const resetUser = await User.create({
      name: 'Reset Test',
      email: `reset_${ts}@test.com`,
      password: 'OldPassword123!',
      role: 'donor'
    });
    const rawResetToken = resetUser.getResetPasswordToken();
    await resetUser.save({ validateBeforeSave: false });

    // Use token once
    const resetOkRes = await fetch(`${baseUrl}/api/auth/reset-password/${rawResetToken}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'BrandNewPassword123!' })
    });
    if (resetOkRes.status !== 200) throw new Error(`Expected 200 for valid reset, got ${resetOkRes.status}`);
    console.log('✅ Password successfully reset with valid token');

    // Token reuse attempt
    const reusedRes = await fetch(`${baseUrl}/api/auth/reset-password/${rawResetToken}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'AnotherNewPassword!' })
    });
    if (reusedRes.status !== 400) throw new Error(`Expected 400 for reused token, got ${reusedRes.status}`);
    console.log('✅ Reused reset token rejected immediately (400)');

    console.log('\n🎉 ALL AUTHENTICATION & ACCESS SECURITY TESTS PASSED! 🎉\n');
  } finally {
    if (server) server.close();
    await mongoose.disconnect();
  }
}

runAuthSecurityTests().catch((err) => {
  console.error('❌ Auth security test failed:', err);
  process.exit(1);
});

const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const User = require('../models/User');
const app = require('../app');

const PORT = 5008;
let server;
const baseUrl = `http://localhost:${PORT}`;

async function runPasswordResetFlowTest() {
  console.log('====================================================');
  console.log('    TEST: FORGOT PASSWORD & RESET PASSWORD HTTP FLOW ');
  console.log('====================================================');

  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/food-donation');
    await new Promise((resolve) => {
      server = app.listen(PORT, () => resolve());
    });

    const timestamp = Date.now();
    const testEmail = `pwd_reset_${timestamp}@test.com`;

    // 1. Register test user
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Reset Test User',
        email: testEmail,
        password: 'OriginalPassword123!',
        role: 'donor',
        phone: `91${String(timestamp).slice(-8)}`
      })
    });
    if (regRes.status !== 201) throw new Error(`Registration failed: ${await regRes.text()}`);
    console.log('✅ 1. Test user registered for password reset flow');

    // 2. Request forgot password via HTTP API
    const forgotRes = await fetch(`${baseUrl}/api/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://food-donation-platform-psi.vercel.app'
      },
      body: JSON.stringify({ email: testEmail })
    });

    const forgotData = await forgotRes.json();
    console.log('Forgot password HTTP response:', forgotRes.status, forgotData);
    if (forgotRes.status !== 200) {
      throw new Error(`Expected 200 from forgot-password, got ${forgotRes.status}`);
    }
    console.log('✅ 2. POST /api/auth/forgot-password succeeded with 200 OK');

    // 3. Retrieve user from DB to obtain active reset token
    const userInDb = await User.findOne({ email: testEmail });
    if (!userInDb.resetPasswordToken || !userInDb.resetPasswordExpire) {
      throw new Error('User in DB does not have resetPasswordToken set!');
    }
    console.log('✅ 3. Reset token securely generated and saved in MongoDB');

    // 4. Test Reset Password with invalid token
    const invalidReset = await fetch(`${baseUrl}/api/auth/reset-password/invalidtoken123`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'NewSecurePassword456!' })
    });
    if (invalidReset.status !== 400) {
      throw new Error(`Expected 400 for invalid reset token, got ${invalidReset.status}`);
    }
    console.log('✅ 4. PUT /api/auth/reset-password rejected invalid token with 400 Bad Request');

    // Clean up test user
    await User.deleteOne({ email: testEmail });
    console.log('✅ 5. Test user cleaned up');

    console.log('\n🎉 PASSWORD RESET FLOW VERIFIED SUCCESSFULLY! 🎉\n');
  } catch (err) {
    console.error('❌ Password Reset Flow Test Failed:', err.message);
    process.exit(1);
  } finally {
    if (server) server.close();
    await mongoose.connection.close();
    process.exit(0);
  }
}

runPasswordResetFlowTest();

/**
 * verifyLiveJWT.js
 * Verifies whether the LIVE Render backend is using the OLD weak JWT secret
 * or the NEW 512-bit secret generated locally.
 *
 * Strategy:
 *  1. Register a temp user on LIVE Render → get token
 *  2. Try to verify the token locally using the NEW secret → should FAIL if Render uses old
 *  3. Try to verify the token using the OLD weak secret → should SUCCEED if Render uses old
 *  4. Clean up: delete the temp test user via login + profile-delete or leave as benign
 *
 * NEVER prints actual secret values or tokens (truncated only).
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const https = require('https');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const LIVE_API = 'https://food-donation-platform-server-1y4h.onrender.com/api';
const OLD_WEAK_SECRET = 'supersecretjwtkey';
const NEW_LOCAL_SECRET = process.env.JWT_SECRET;

const TEST_EMAIL = `audit_jwt_${Date.now()}@sharebite-test.invalid`;
const TEST_PASSWORD = 'AuditTest@9988!';
const TEST_NAME = 'JWT Audit Test';

function apiRequest(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(LIVE_API + path);
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function maskToken(token) {
  if (!token || token.length < 20) return '[short-token]';
  return token.substring(0, 12) + '...[MASKED]';
}

async function main() {
  console.log('=== LIVE RENDER JWT_SECRET VERIFICATION ===\n');
  console.log(`New local JWT_SECRET length: ${NEW_LOCAL_SECRET ? NEW_LOCAL_SECRET.length : 'NOT SET'} chars`);
  console.log(`Old weak secret: "[MASKED - known weak value]"\n`);

  // Step 1: Register test user on live Render
  console.log('STEP 1: Registering temp test user on live Render...');
  const regRes = await apiRequest('POST', '/auth/register', {
    name: TEST_NAME,
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    role: 'donor',
  });
  console.log(`  Register status: ${regRes.status}`);
  if (regRes.status !== 201 && regRes.status !== 200) {
    console.error('  FAILED to register. Response:', JSON.stringify(regRes.body).substring(0, 200));
    process.exit(1);
  }
  console.log('  ✅ Registered successfully');

  // Step 2: Login to get a live Render JWT
  console.log('\nSTEP 2: Logging in to get live JWT from Render...');
  const loginRes = await apiRequest('POST', '/auth/login', {
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });
  console.log(`  Login status: ${loginRes.status}`);
  const liveToken = loginRes.body?.token;
  if (!liveToken) {
    console.error('  FAILED to get token. Response:', JSON.stringify(loginRes.body).substring(0, 200));
    process.exit(1);
  }
  console.log(`  Live token obtained: ${maskToken(liveToken)}`);

  // Step 3: Decode header (no verification) to see algorithm
  const decoded = jwt.decode(liveToken, { complete: true });
  console.log(`\nSTEP 3: JWT header algorithm: ${decoded?.header?.alg || 'unknown'}`);

  // Step 4: Try verifying with NEW local secret
  console.log('\nSTEP 4: Verifying live token against NEW 512-bit local secret...');
  let newSecretVerified = false;
  try {
    jwt.verify(liveToken, NEW_LOCAL_SECRET);
    newSecretVerified = true;
    console.log('  Result: ✅ VERIFIED with NEW secret → Render IS using the new secret');
  } catch (e) {
    console.log(`  Result: ❌ FAILED with NEW secret (${e.message}) → Render NOT using new secret`);
  }

  // Step 5: Try verifying with OLD weak secret
  console.log('\nSTEP 5: Verifying live token against OLD weak secret...');
  let oldSecretVerified = false;
  try {
    jwt.verify(liveToken, OLD_WEAK_SECRET);
    oldSecretVerified = true;
    console.log('  Result: ✅ VERIFIED with OLD secret → Render IS still using the OLD weak secret');
  } catch (e) {
    console.log(`  Result: ❌ FAILED with OLD secret (${e.message})`);
  }

  // Step 6: Conclusion
  console.log('\n=== CONCLUSION ===');
  if (newSecretVerified && !oldSecretVerified) {
    console.log('✅ RENDER JWT_SECRET: UPDATED — live tokens signed with NEW 512-bit secret');
  } else if (oldSecretVerified && !newSecretVerified) {
    console.log('⚠️  RENDER JWT_SECRET: NOT UPDATED — live tokens still signed with OLD weak secret');
    console.log('   ACTION REQUIRED: Go to Render dashboard → Environment → Set JWT_SECRET to new value');
  } else if (oldSecretVerified && newSecretVerified) {
    console.log('⚠️  UNEXPECTED: Both secrets verify the token (secrets may be identical or token is unsigned)');
  } else {
    console.log('❌ UNEXPECTED: Neither secret verifies the token');
  }

  // Step 7: Try to clean up test user (delete via profile endpoint if available)
  console.log('\nSTEP 7: Cleanup — attempting to delete test user...');
  try {
    const delRes = await apiRequest('DELETE', '/auth/profile', null, liveToken);
    if (delRes.status === 200 || delRes.status === 204) {
      console.log('  ✅ Test user deleted from live DB');
    } else {
      console.log(`  ℹ️  Delete returned ${delRes.status} — test user may remain (benign, non-production email)`);
    }
  } catch (e) {
    console.log('  ℹ️  Delete attempt failed (endpoint may not exist) — test user remains');
  }

  console.log('\n=== END OF JWT VERIFICATION ===');
}

main().catch((e) => {
  console.error('Fatal error:', e.message);
  process.exit(1);
});

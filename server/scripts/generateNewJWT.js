/**
 * generateNewJWT.js
 * Generates a cryptographically secure 512-bit JWT secret and updates server/.env safely.
 * Run from the server/ directory: node scripts/generateNewJWT.js
 *
 * NEVER prints the actual secret value.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ENV_PATH = path.join(__dirname, '../.env');

if (!fs.existsSync(ENV_PATH)) {
  console.error('❌ server/.env not found. Run from the server/ directory.');
  process.exit(1);
}

const newSecret = crypto.randomBytes(64).toString('hex');
const envContent = fs.readFileSync(ENV_PATH, 'utf8');

const updatedContent = envContent.replace(/^JWT_SECRET=.*/m, `JWT_SECRET=${newSecret}`);

if (!updatedContent.includes(`JWT_SECRET=${newSecret}`)) {
  // JWT_SECRET line didn't exist — append it
  fs.writeFileSync(ENV_PATH, envContent.trimEnd() + `\nJWT_SECRET=${newSecret}\n`, 'utf8');
  console.log('✅ JWT_SECRET appended to server/.env');
} else {
  fs.writeFileSync(ENV_PATH, updatedContent, 'utf8');
  console.log('✅ JWT_SECRET replaced in server/.env');
}

console.log(`ℹ️  New secret length: ${newSecret.length} characters (512-bit)`);
console.log('ℹ️  Value NOT displayed for security.');
console.log('');
console.log('Next steps:');
console.log('  1. Copy the JWT_SECRET value from server/.env');
console.log('  2. Go to: https://dashboard.render.com → your service → Environment');
console.log('  3. Set JWT_SECRET to the new value and Save Changes');
console.log('  4. Run: node tests/verifyLiveJWT.js  (to confirm Render uses new secret)');

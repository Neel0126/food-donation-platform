/**
 * verifyMongoCredentials.js
 * Tests MongoDB Atlas connectivity without exposing credential values.
 * Run: node scripts/verifyMongoCredentials.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

async function main() {
  const uri = process.env.MONGO_URI || '';
  if (!uri) {
    console.error('❌ MONGO_URI not set in environment.');
    process.exit(1);
  }

  // Parse URI safely (never print password)
  const match = uri.match(/mongodb\+srv:\/\/([^:]+):([^@]+)@([^/]+)\/([^?]+)/);
  if (match) {
    console.log('MongoDB Atlas URI Analysis:');
    console.log(`  User:     ${match[1]}`);
    console.log(`  Password: ${'*'.repeat(match[2].length)} (${match[2].length} chars, hidden)`);
    console.log(`  Cluster:  ${match[3]}`);
    console.log(`  Database: ${match[4]}`);
    console.log(`  Is known weak password (neel2006): ${match[2] === 'neel2006' ? '⚠️  YES — MUST ROTATE' : '✅ NO — already changed'}`);
  }

  console.log('\nConnecting to MongoDB Atlas...');
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 20000,
    });
    const { host, name, readyState } = mongoose.connection;
    console.log(`✅ Connected — Host: ${host} | DB: ${name} | State: ${readyState === 1 ? 'connected' : readyState}`);

    // Count documents in key collections
    const collections = ['users', 'donations', 'ngoprofiles', 'volunteerprofiles'];
    console.log('\nCollection counts (read-only):');
    for (const col of collections) {
      try {
        const count = await mongoose.connection.db.collection(col).countDocuments();
        console.log(`  ${col}: ${count} documents`);
      } catch {
        console.log(`  ${col}: (not found or no access)`);
      }
    }
    console.log('\n✅ MongoDB Atlas: OPERATIONAL');
  } catch (err) {
    console.error(`❌ Connection failed: ${err.message}`);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Connection closed.');
  }
}

main();

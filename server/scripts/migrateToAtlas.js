/**
 * Migration Script: Local MongoDB → MongoDB Atlas
 * Run: node scripts/migrateToAtlas.js
 */

const mongoose = require('mongoose');

const LOCAL_URI = 'mongodb://127.0.0.1:27017/food-donation';
const ATLAS_URI = 'mongodb+srv://panchalneel645_db_user:neel2006@cluster0.lpm2ujd.mongodb.net/food-donation?retryWrites=true&w=majority&appName=Cluster0';

const COLLECTIONS = [
  'users',
  'donations',
  'ngoprofiles',
  'volunteerprofiles',
  'notifications',
  'complaints',
];

async function migrate() {
  console.log('\n🚀 Starting migration: Local MongoDB → Atlas\n');

  // Connect to local MongoDB
  const localConn = await mongoose.createConnection(LOCAL_URI).asPromise();
  console.log('✅ Connected to Local MongoDB');

  // Connect to Atlas
  const atlasConn = await mongoose.createConnection(ATLAS_URI).asPromise();
  console.log('✅ Connected to MongoDB Atlas\n');

  let totalMigrated = 0;

  for (const collectionName of COLLECTIONS) {
    try {
      const localCollection = localConn.collection(collectionName);
      const atlasCollection = atlasConn.collection(collectionName);

      // Fetch all docs from local
      const docs = await localCollection.find({}).toArray();

      if (docs.length === 0) {
        console.log(`⚠️  ${collectionName}: No documents found — skipping`);
        continue;
      }

      // Drop existing data in Atlas for this collection (clean slate)
      await atlasCollection.deleteMany({});

      // Insert into Atlas
      const result = await atlasCollection.insertMany(docs, { ordered: false });
      console.log(`📦 ${collectionName}: Migrated ${result.insertedCount} / ${docs.length} documents`);
      totalMigrated += result.insertedCount;

    } catch (err) {
      console.error(`❌ Error migrating ${collectionName}:`, err.message);
    }
  }

  console.log(`\n✅ Migration complete! Total documents migrated: ${totalMigrated}`);

  await localConn.close();
  await atlasConn.close();
  process.exit(0);
}

migrate().catch((err) => {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
});

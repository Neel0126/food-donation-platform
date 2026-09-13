/**
 * Seed an initial admin user.
 *
 * Usage:
 *   node scripts/seedAdmin.js
 *
 * Environment variables (.env in server/):
 *   MONGO_URI — MongoDB connection string
 *   ADMIN_NAME    (optional, default: "Platform Admin")
 *   ADMIN_EMAIL   (optional, default: "admin@sharebite.com")
 *   ADMIN_PASS    (optional, default: "Admin@123")
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const ADMIN_NAME = process.env.ADMIN_NAME || 'Platform Admin';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@sharebite.com';
const ADMIN_PASS = process.env.ADMIN_PASS || 'Admin@123';

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Check if admin already exists
    const existing = await User.findOne({ email: ADMIN_EMAIL });
    if (existing) {
      console.log(`Admin user already exists: ${existing.email} (role: ${existing.role})`);
      if (existing.role !== 'admin') {
        existing.role = 'admin';
        existing.isVerified = true;
        await existing.save();
        console.log(`Updated role to "admin" for ${existing.email}`);
      }
      process.exit(0);
    }

    const admin = await User.create({
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      password: ADMIN_PASS,
      role: 'admin',
      isVerified: true
    });

    console.log('Admin user created successfully:');
    console.log(`  Name:  ${admin.name}`);
    console.log(`  Email: ${admin.email}`);
    console.log(`  Role:  ${admin.role}`);
    console.log(`  Pass:  ${ADMIN_PASS}`);
    console.log('\n⚠️  Change the default password after first login!');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin:', error.message);
    process.exit(1);
  }
};

seedAdmin();

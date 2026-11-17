require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const cloudinary = require('../config/cloudinary');

async function testCloudinary() {
  console.log('--- Testing Cloudinary API Connectivity & Credentials ---');
  try {
    const pingResult = await cloudinary.api.ping();
    console.log('✅ Cloudinary ping status:', pingResult.status); // should be 'ok'
    
    // Upload a minimal 1x1 test gif data URI to verify write permissions
    const test1x1DataUri = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    const uploadRes = await cloudinary.uploader.upload(test1x1DataUri, {
      folder: 'food-donation-platform/test',
      tags: ['security-audit-test']
    });
    console.log('✅ Cloudinary upload successful. Public ID:', uploadRes.public_id);
    
    // Cleanup the uploaded test image
    await cloudinary.uploader.destroy(uploadRes.public_id);
    console.log('✅ Cloudinary test asset successfully destroyed and cleaned up.');
    console.log('\n🎉 CLOUDINARY CREDENTIALS VERIFIED OPERATIONAL! 🎉');
  } catch (err) {
    console.error('❌ Cloudinary Verification Error:', err.error?.message || err.message || JSON.stringify(err));
  }
}

testCloudinary();

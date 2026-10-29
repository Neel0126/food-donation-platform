const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const sendEmail = require('../utils/sendEmail');


(async () => {
  // Send to a DIFFERENT email to avoid Gmail self-send filtering
  const testRecipient = 'panchalneel645@gmail.com'; // ← change this to any other email you own

  console.log(`Testing Gmail OAuth2 — sending to ${testRecipient}...`);
  try {
    await sendEmail({
      email: testRecipient,
      subject: 'ShareBite — Gmail OAuth2 Test ✅',
      message: 'If you received this, Gmail OAuth2 is working correctly on your setup!',
      html: '<h2>✅ Gmail OAuth2 Working!</h2><p>ShareBite email is configured correctly and ready for production.</p>'
    });
    console.log('✅ Test email sent! Check your inbox at', process.env.GMAIL_USER);
  } catch (err) {
    console.error('❌ Test failed:', err.message);
  }
  process.exit(0);
})();

const crypto = require('crypto');

/**
 * Generate a cryptographically secure 6-digit numeric OTP string
 */
const generateOtp = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

module.exports = {
  generateOtp
};

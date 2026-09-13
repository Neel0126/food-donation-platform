/**
 * Generate a 6-digit numeric OTP string
 */
const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

module.exports = {
  generateOtp
};

const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  forgotPassword,
  resetPassword,
  getPublicNgoList,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { loginRateLimiter, passwordResetLimiter } = require('../middleware/rateLimiter');

router.get('/ngos', getPublicNgoList);
router.post('/register', registerUser);
router.post('/login', loginRateLimiter, loginUser);
router.route('/profile')
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);
router.post('/forgot-password', passwordResetLimiter, forgotPassword);
router.put('/reset-password/:token', resetPassword);

module.exports = router;

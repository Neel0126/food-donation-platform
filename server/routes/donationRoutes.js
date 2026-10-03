const express = require('express');
const router = express.Router();
const {
  createDonation,
  getDonorDonations,
  getDonationById,
  updateDonation,
  cancelDonation,
  regeneratePickupOtp,
  getPublicStats,
} = require('../controllers/donationController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const validateObjectId = require('../middleware/validateObjectId');

router.param('id', validateObjectId());

// Public endpoints (no authentication required)
router.get('/public-stats', getPublicStats);

// All subsequent donation routes require authentication
router.use(protect);

router.route('/')
  .post(authorize('donor'), upload.single('image'), createDonation)
  .get(authorize('donor'), getDonorDonations);

router.route('/:id')
  .get(getDonationById) // Allow donors (and later NGOs/admins)
  .put(authorize('donor'), upload.single('image'), updateDonation);

router.put('/:id/cancel', authorize('donor'), cancelDonation);
router.put('/:id/regenerate-pickup-otp', authorize('donor'), regeneratePickupOtp);

module.exports = router;

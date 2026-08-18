const express = require('express');
const router = express.Router();
const {
  createDonation,
  getDonorDonations,
  getDonationById,
  updateDonation,
  cancelDonation,
} = require('../controllers/donationController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

// All donation routes require authentication, some specific to donors
router.use(protect);

router.route('/')
  .post(authorize('donor'), upload.single('image'), createDonation)
  .get(authorize('donor'), getDonorDonations);

router.route('/:id')
  .get(getDonationById) // Allow donors (and later NGOs/admins)
  .put(authorize('donor'), upload.single('image'), updateDonation);

router.put('/:id/cancel', authorize('donor'), cancelDonation);

module.exports = router;

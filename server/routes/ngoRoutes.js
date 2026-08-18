const express = require('express');
const router = express.Router();
const uploadDoc = require('../middleware/uploadDoc');
const { protect, authorize } = require('../middleware/auth');
const {
  registerNgoProfile,
  getNearbyDonations,
  acceptDonation,
  requestVolunteer,
  confirmDelivery
} = require('../controllers/ngoController');

// All routes here are restricted to NGOs
router.use(protect);
router.use(authorize('ngo'));

// NGO Profile Registration
router.post('/register', uploadDoc.single('document'), registerNgoProfile);

// Donations
router.get('/donations', getNearbyDonations);
router.put('/donations/:id/accept', acceptDonation);
router.put('/donations/:id/request-volunteer', requestVolunteer);
router.put('/donations/:id/confirm-delivery', confirmDelivery);

module.exports = router;

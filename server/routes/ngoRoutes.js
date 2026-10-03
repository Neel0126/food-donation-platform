const express = require('express');
const router = express.Router();
const uploadDoc = require('../middleware/uploadDoc');
const upload = require('../middleware/upload');
const { protect, authorize } = require('../middleware/auth');
const validateObjectId = require('../middleware/validateObjectId');

// Validate all :id route parameters
router.param('id', validateObjectId());
const {
  registerNgoProfile,
  getNearbyDonations,
  getMyAcceptedDonations,
  acceptDonation,
  releaseAcceptedDonation,
  regenerateDeliveryOtp,
  requestVolunteer,
  getAvailableVolunteers,
  assignVolunteer,
  confirmDelivery,
  rateVolunteer,
  getVerifiedNgos,
  getMyNgoProfile,
  updateNgoProfile,
  getMyVolunteers,
  addVolunteerToNgo
} = require('../controllers/ngoController');

// Directory of verified NGOs (accessible to donors and all authenticated users)
router.get('/directory', protect, getVerifiedNgos);

// All subsequent routes here are restricted to NGOs
router.use(protect);
router.use(authorize('ngo'));

// NGO Profile Registration & Management
router.post('/register', uploadDoc.single('document'), registerNgoProfile);
router.get('/profile', getMyNgoProfile);
router.put(
  '/profile',
  upload.fields([
    { name: 'coverImage', maxCount: 1 },
    { name: 'logo', maxCount: 1 },
  ]),
  updateNgoProfile
);

// Donations
router.get('/donations', getNearbyDonations);
router.get('/my-donations', getMyAcceptedDonations);
router.put('/donations/:id/accept', acceptDonation);
router.put('/donations/:id/release', releaseAcceptedDonation);
router.put('/donations/:id/regenerate-delivery-otp', regenerateDeliveryOtp);
router.put('/donations/:id/request-volunteer', requestVolunteer);
router.put('/donations/:id/confirm-delivery', confirmDelivery);

// Volunteers & Rating
router.get('/volunteers', getMyVolunteers);
router.post('/volunteers', addVolunteerToNgo);
router.get('/volunteers/available', getAvailableVolunteers);
router.put('/donations/:id/assign-volunteer', assignVolunteer);
router.post('/donations/:id/rate-volunteer', rateVolunteer);

module.exports = router;

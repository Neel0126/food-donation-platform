const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { protect, authorize } = require('../middleware/auth');
const {
  getVolunteerProfile,
  updateVolunteerProfile,
  updateAvailabilityStatus,
  getAvailableTasks,
  getMyTasks,
  getTaskById,
  acceptTask,
  rejectTask,
  verifyPickupOtp,
  uploadDeliveryProof,
  verifyDeliveryOtp,
  completeTask,
  getVolunteerStats,
  updateTaskLocation
} = require('../controllers/volunteerController');
const validateObjectId = require('../middleware/validateObjectId');

// Validate all :id route parameters
router.param('id', validateObjectId());

// All volunteer routes require authentication & volunteer role
router.use(protect);
router.use(authorize('volunteer'));

// Profile & Stats
router.route('/profile')
  .get(getVolunteerProfile)
  .put(updateVolunteerProfile);

router.put('/status', updateAvailabilityStatus);
router.get('/stats', getVolunteerStats);

// Tasks
router.get('/tasks/available', getAvailableTasks);
router.get('/tasks/my-tasks', getMyTasks);
router.get('/tasks/:id', getTaskById);

// Task Actions
router.put('/tasks/:id/accept', acceptTask);
router.put('/tasks/:id/reject', rejectTask);
router.put('/tasks/:id/location', updateTaskLocation);
router.post('/tasks/:id/verify-pickup', verifyPickupOtp);
router.post('/tasks/:id/delivery-proof', upload.single('proof'), uploadDeliveryProof);
router.post('/tasks/:id/verify-delivery', verifyDeliveryOtp);
router.put('/tasks/:id/complete', upload.single('proof'), completeTask);

module.exports = router;

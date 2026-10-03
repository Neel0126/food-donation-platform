const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const validateObjectId = require('../middleware/validateObjectId');

// Validate all :id route parameters
router.param('id', validateObjectId());
const {
  getDashboardStats,
  getAllUsers,
  getUserById,
  updateUserStatus,
  deleteUser,
  getPendingNgos,
  approveNgo,
  rejectNgo,
  getAllDonations,
  getDonationDetail,
  updateDonationStatus,
  getAllComplaints,
  getComplaintById,
  resolveComplaint,
  fileComplaint,
  getMyComplaints
} = require('../controllers/adminController');

// Complaint filing & viewing my complaints — any authenticated user
router.post('/complaints', protect, fileComplaint);
router.get('/my-complaints', protect, getMyComplaints);

// All other admin routes require admin role
router.use(protect, authorize('admin'));

// Dashboard stats
router.get('/stats', getDashboardStats);

// User management
router.get('/users', getAllUsers);
router.route('/users/:id')
  .get(getUserById)
  .put(updateUserStatus)
  .delete(deleteUser);

// NGO approval
router.get('/ngos/pending', getPendingNgos);
router.put('/ngos/:id/approve', approveNgo);
router.put('/ngos/:id/reject', rejectNgo);

// Donation management
router.get('/donations', getAllDonations);
router.get('/donations/:id', getDonationDetail);
router.put('/donations/:id/status', updateDonationStatus);

// Complaint management
router.get('/complaints', getAllComplaints);
router.get('/complaints/:id', getComplaintById);
router.put('/complaints/:id/resolve', resolveComplaint);

module.exports = router;

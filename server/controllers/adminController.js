const User = require('../models/User');
const Donation = require('../models/Donation');
const NgoProfile = require('../models/NgoProfile');
const VolunteerProfile = require('../models/VolunteerProfile');
const Complaint = require('../models/Complaint');

// ────────────────────────────────────────────────────────
//  DASHBOARD STATISTICS
// ────────────────────────────────────────────────────────

// @desc    Get aggregated platform statistics
// @route   GET /api/admin/stats
// @access  Private/Admin
const getDashboardStats = async (req, res) => {
  try {
    // User counts by role
    const [totalUsers, donors, ngos, volunteers, admins] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'donor' }),
      User.countDocuments({ role: 'ngo' }),
      User.countDocuments({ role: 'volunteer' }),
      User.countDocuments({ role: 'admin' })
    ]);

    // Donation counts by status
    const [
      totalDonations,
      pendingDonations,
      acceptedDonations,
      assignedDonations,
      deliveredDonations,
      cancelledDonations
    ] = await Promise.all([
      Donation.countDocuments(),
      Donation.countDocuments({ status: 'pending' }),
      Donation.countDocuments({ status: 'accepted' }),
      Donation.countDocuments({ status: 'assigned' }),
      Donation.countDocuments({ status: 'delivered' }),
      Donation.countDocuments({ status: 'cancelled' })
    ]);

    // NGO verification counts
    const [pendingNgos, approvedNgos, rejectedNgos] = await Promise.all([
      NgoProfile.countDocuments({ verificationStatus: 'pending' }),
      NgoProfile.countDocuments({ verificationStatus: 'approved' }),
      NgoProfile.countDocuments({ verificationStatus: 'rejected' })
    ]);

    // Complaint counts
    const [openComplaints, investigatingComplaints, resolvedComplaints, dismissedComplaints] = await Promise.all([
      Complaint.countDocuments({ status: 'open' }),
      Complaint.countDocuments({ status: 'investigating' }),
      Complaint.countDocuments({ status: 'resolved' }),
      Complaint.countDocuments({ status: 'dismissed' })
    ]);

    // Recent activity — last 10 donations
    const recentDonations = await Donation.find()
      .populate('donor', 'name')
      .populate('acceptedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(10)
      .select('foodType quantity status createdAt donor acceptedBy');

    // Recent users — last 5
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name email role createdAt');

    res.json({
      users: { total: totalUsers, donors, ngos, volunteers, admins },
      donations: {
        total: totalDonations,
        pending: pendingDonations,
        accepted: acceptedDonations,
        assigned: assignedDonations,
        delivered: deliveredDonations,
        cancelled: cancelledDonations
      },
      ngoVerifications: {
        pending: pendingNgos,
        approved: approvedNgos,
        rejected: rejectedNgos
      },
      complaints: {
        open: openComplaints,
        investigating: investigatingComplaints,
        resolved: resolvedComplaints,
        dismissed: dismissedComplaints
      },
      recentDonations,
      recentUsers
    });
  } catch (error) {
    console.error('Error in getDashboardStats:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// ────────────────────────────────────────────────────────
//  USER MANAGEMENT
// ────────────────────────────────────────────────────────

// @desc    Get all users (paginated, filterable)
// @route   GET /api/admin/users?page=1&limit=20&role=donor&search=john
// @access  Private/Admin
const getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const query = {};

    // Filter by role
    if (req.query.role && ['donor', 'ngo', 'volunteer', 'admin'].includes(req.query.role)) {
      query.role = req.query.role;
    }

    // Search by name or email
    if (req.query.search && req.query.search.trim()) {
      const searchRegex = new RegExp(req.query.search.trim(), 'i');
      query.$or = [
        { name: searchRegex },
        { email: searchRegex }
      ];
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(query)
    ]);

    res.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error in getAllUsers:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get a single user with profile details
// @route   GET /api/admin/users/:id
// @access  Private/Admin
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let profile = null;
    if (user.role === 'ngo') {
      profile = await NgoProfile.findOne({ user: user._id });
    } else if (user.role === 'volunteer') {
      profile = await VolunteerProfile.findOne({ user: user._id });
    }

    // Get user's donation stats
    const donationCount = await Donation.countDocuments({
      $or: [
        { donor: user._id },
        { acceptedBy: user._id },
        { assignedVolunteer: user._id }
      ]
    });

    res.json({ user, profile, donationCount });
  } catch (error) {
    console.error('Error in getUserById:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Update user status (verify, change role, disable)
// @route   PUT /api/admin/users/:id
// @access  Private/Admin
const updateUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent self-modification of critical fields
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot modify your own admin account through this endpoint' });
    }

    const { isVerified, role } = req.body;

    if (isVerified !== undefined) {
      user.isVerified = isVerified;
    }

    if (role && ['donor', 'ngo', 'volunteer', 'admin'].includes(role)) {
      user.role = role;
    }

    const updatedUser = await user.save();

    res.json({
      message: 'User updated successfully',
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        isVerified: updatedUser.isVerified
      }
    });
  } catch (error) {
    console.error('Error in updateUserStatus:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Delete a user and cascade-clean linked profiles
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent self-deletion
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot delete your own admin account' });
    }

    // Cascade clean linked data
    if (user.role === 'ngo') {
      await NgoProfile.deleteOne({ user: user._id });
    }
    if (user.role === 'volunteer') {
      await VolunteerProfile.deleteOne({ user: user._id });
    }

    // Remove user
    await User.deleteOne({ _id: user._id });

    res.json({ message: `User "${user.name}" deleted successfully` });
  } catch (error) {
    console.error('Error in deleteUser:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// ────────────────────────────────────────────────────────
//  NGO APPROVAL
// ────────────────────────────────────────────────────────

// @desc    Get all pending NGO verification requests
// @route   GET /api/admin/ngos/pending
// @access  Private/Admin
const getPendingNgos = async (req, res) => {
  try {
    const statusFilter = req.query.status || 'pending';
    const query = {};

    if (statusFilter !== 'all') {
      query.verificationStatus = statusFilter;
    }

    const ngos = await NgoProfile.find(query)
      .populate('user', 'name email phone createdAt')
      .sort({ createdAt: -1 });

    res.json(ngos);
  } catch (error) {
    console.error('Error in getPendingNgos:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Approve an NGO
// @route   PUT /api/admin/ngos/:id/approve
// @access  Private/Admin
const approveNgo = async (req, res) => {
  try {
    const ngoProfile = await NgoProfile.findById(req.params.id);
    if (!ngoProfile) {
      return res.status(404).json({ message: 'NGO profile not found' });
    }

    ngoProfile.verificationStatus = 'approved';
    await ngoProfile.save();

    // Also set user.isVerified = true
    await User.findByIdAndUpdate(ngoProfile.user, { isVerified: true });

    const populated = await NgoProfile.findById(ngoProfile._id)
      .populate('user', 'name email phone');

    res.json({
      message: `NGO "${ngoProfile.organizationName}" approved successfully`,
      ngoProfile: populated
    });
  } catch (error) {
    console.error('Error in approveNgo:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Reject an NGO
// @route   PUT /api/admin/ngos/:id/reject
// @access  Private/Admin
const rejectNgo = async (req, res) => {
  try {
    const { reason } = req.body;

    const ngoProfile = await NgoProfile.findById(req.params.id);
    if (!ngoProfile) {
      return res.status(404).json({ message: 'NGO profile not found' });
    }

    ngoProfile.verificationStatus = 'rejected';
    await ngoProfile.save();

    // Keep user.isVerified = false
    await User.findByIdAndUpdate(ngoProfile.user, { isVerified: false });

    const populated = await NgoProfile.findById(ngoProfile._id)
      .populate('user', 'name email phone');

    res.json({
      message: `NGO "${ngoProfile.organizationName}" rejected${reason ? ': ' + reason : ''}`,
      ngoProfile: populated
    });
  } catch (error) {
    console.error('Error in rejectNgo:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// ────────────────────────────────────────────────────────
//  DONATION MANAGEMENT
// ────────────────────────────────────────────────────────

// @desc    Get all donations (paginated, filterable)
// @route   GET /api/admin/donations?page=1&limit=20&status=pending&search=meals
// @access  Private/Admin
const getAllDonations = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const query = {};

    if (req.query.status && req.query.status !== 'all') {
      query.status = req.query.status;
    }

    if (req.query.search && req.query.search.trim()) {
      const searchRegex = new RegExp(req.query.search.trim(), 'i');
      query.$or = [
        { foodType: searchRegex },
        { description: searchRegex },
        { 'pickupLocation.city': searchRegex },
        { 'pickupLocation.street': searchRegex }
      ];
    }

    const [donations, total] = await Promise.all([
      Donation.find(query)
        .populate('donor', 'name email')
        .populate('acceptedBy', 'name email')
        .populate('assignedVolunteer', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Donation.countDocuments(query)
    ]);

    res.json({
      donations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error in getAllDonations:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get a single donation with full details
// @route   GET /api/admin/donations/:id
// @access  Private/Admin
const getDonationDetail = async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id)
      .populate('donor', 'name email phone address')
      .populate('acceptedBy', 'name email phone')
      .populate('assignedVolunteer', 'name email phone');

    if (!donation) {
      return res.status(404).json({ message: 'Donation not found' });
    }

    res.json(donation);
  } catch (error) {
    console.error('Error in getDonationDetail:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Admin override — update donation status
// @route   PUT /api/admin/donations/:id/status
// @access  Private/Admin
const updateDonationStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const validStatuses = ['pending', 'accepted', 'assigned', 'picked_up', 'delivered', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const donation = await Donation.findById(req.params.id);
    if (!donation) {
      return res.status(404).json({ message: 'Donation not found' });
    }

    const previousStatus = donation.status;
    donation.status = status;

    // Set timestamps based on status
    if (status === 'delivered' && !donation.deliveredAt) {
      donation.deliveredAt = new Date();
    }

    // Update volunteer profile if transitioning to delivered
    if (status === 'delivered' && donation.assignedVolunteer) {
      donation.volunteerStatus = 'completed';
      const volProfile = await VolunteerProfile.findOne({ user: donation.assignedVolunteer });
      if (volProfile) {
        volProfile.completedDeliveries += 1;
        volProfile.activeDeliveries = Math.max(0, volProfile.activeDeliveries - 1);
        if (volProfile.activeDeliveries === 0) {
          volProfile.availabilityStatus = 'available';
        }
        await volProfile.save();
      }
    }

    await donation.save();

    res.json({
      message: `Donation status updated from "${previousStatus}" to "${status}"`,
      donation
    });
  } catch (error) {
    console.error('Error in updateDonationStatus:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// ────────────────────────────────────────────────────────
//  COMPLAINT MANAGEMENT
// ────────────────────────────────────────────────────────

// @desc    Get all complaints (paginated, filterable)
// @route   GET /api/admin/complaints?page=1&limit=20&status=open
// @access  Private/Admin
const getAllComplaints = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const query = {};

    if (req.query.status && req.query.status !== 'all') {
      query.status = req.query.status;
    }

    if (req.query.type) {
      query.type = req.query.type;
    }

    const [complaints, total] = await Promise.all([
      Complaint.find(query)
        .populate('complainant', 'name email role')
        .populate('against', 'name email role')
        .populate('donation', 'foodType quantity status')
        .populate('resolvedBy', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Complaint.countDocuments(query)
    ]);

    res.json({
      complaints,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error in getAllComplaints:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get a single complaint with full details
// @route   GET /api/admin/complaints/:id
// @access  Private/Admin
const getComplaintById = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('complainant', 'name email role phone')
      .populate('against', 'name email role phone')
      .populate('donation', 'foodType quantity status pickupLocation dropoffLocation')
      .populate('resolvedBy', 'name email');

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    res.json(complaint);
  } catch (error) {
    console.error('Error in getComplaintById:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Resolve or dismiss a complaint
// @route   PUT /api/admin/complaints/:id/resolve
// @access  Private/Admin
const resolveComplaint = async (req, res) => {
  try {
    const { status, adminNotes } = req.body;

    if (!status || !['resolved', 'dismissed', 'investigating'].includes(status)) {
      return res.status(400).json({ message: 'Status must be one of: resolved, dismissed, investigating' });
    }

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    complaint.status = status;
    if (adminNotes) {
      complaint.adminNotes = adminNotes;
    }

    if (status === 'resolved' || status === 'dismissed') {
      complaint.resolvedBy = req.user._id;
      complaint.resolvedAt = new Date();
    }

    await complaint.save();

    const populated = await Complaint.findById(complaint._id)
      .populate('complainant', 'name email role')
      .populate('against', 'name email role')
      .populate('resolvedBy', 'name');

    res.json({
      message: `Complaint ${status} successfully`,
      complaint: populated
    });
  } catch (error) {
    console.error('Error in resolveComplaint:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// ────────────────────────────────────────────────────────
//  PUBLIC COMPLAINT FILING (any authenticated user)
// ────────────────────────────────────────────────────────

// @desc    File a new complaint
// @route   POST /api/admin/complaints
// @access  Private (any authenticated user)
const fileComplaint = async (req, res) => {
  try {
    const { against, donation, type, description } = req.body;

    if (!against || !type || !description) {
      return res.status(400).json({ message: 'Please provide: against (userId), type, and description' });
    }

    // Verify the target user exists
    const targetUser = await User.findById(against);
    if (!targetUser) {
      return res.status(404).json({ message: 'User being reported not found' });
    }

    // Cannot complain against yourself
    if (against === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot file a complaint against yourself' });
    }

    const complaint = await Complaint.create({
      complainant: req.user._id,
      against,
      donation: donation || undefined,
      type,
      description
    });

    const populated = await Complaint.findById(complaint._id)
      .populate('complainant', 'name email role')
      .populate('against', 'name email role');

    res.status(201).json({
      message: 'Complaint filed successfully. An admin will review it shortly.',
      complaint: populated
    });
  } catch (error) {
    console.error('Error in fileComplaint:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = {
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
  fileComplaint
};

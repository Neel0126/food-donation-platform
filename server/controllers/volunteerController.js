const Donation = require('../models/Donation');
const VolunteerProfile = require('../models/VolunteerProfile');
const NgoProfile = require('../models/NgoProfile');
const User = require('../models/User');
const { generateOtp } = require('../utils/otpUtils');

// @desc    Get volunteer profile
// @route   GET /api/volunteers/profile
// @access  Private (Volunteer)
const getVolunteerProfile = async (req, res) => {
  try {
    let profile = await VolunteerProfile.findOne({ user: req.user._id })
      .populate('ratings.ratedBy', 'name');

    if (!profile) {
      profile = await VolunteerProfile.create({
        user: req.user._id,
        address: {
          street: req.user.address || ''
        }
      });
    }

    res.json({
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        phone: req.user.phone,
        role: req.user.role
      },
      profile
    });
  } catch (error) {
    console.error('Error in getVolunteerProfile:', error);
    res.status(500).json({ message: 'Server error fetching volunteer profile' });
  }
};

// @desc    Update volunteer profile
// @route   PUT /api/volunteers/profile
// @access  Private (Volunteer)
const updateVolunteerProfile = async (req, res) => {
  try {
    const {
      vehicleType,
      vehicleNumber,
      availabilityStatus,
      emergencyContact,
      address,
      phone,
      name
    } = req.body;

    // Update user details if provided
    const user = await User.findById(req.user._id);
    if (phone) user.phone = phone;
    if (name) user.name = name;
    if (address && typeof address === 'string') user.address = address;
    await user.save();

    let profile = await VolunteerProfile.findOne({ user: req.user._id });
    if (!profile) {
      profile = new VolunteerProfile({ user: req.user._id });
    }

    if (vehicleType) profile.vehicleType = vehicleType;
    if (vehicleNumber !== undefined) profile.vehicleNumber = vehicleNumber;
    if (availabilityStatus) profile.availabilityStatus = availabilityStatus;
    if (emergencyContact) {
      profile.emergencyContact = {
        name: emergencyContact.name || profile.emergencyContact?.name || '',
        phone: emergencyContact.phone || profile.emergencyContact?.phone || '',
        relationship: emergencyContact.relationship || profile.emergencyContact?.relationship || ''
      };
    }
    if (address && typeof address === 'object') {
      profile.address = {
        street: address.street || profile.address?.street || '',
        city: address.city || profile.address?.city || '',
        state: address.state || profile.address?.state || '',
        zipCode: address.zipCode || profile.address?.zipCode || '',
        country: address.country || profile.address?.country || 'India'
      };
    }

    const updatedProfile = await profile.save();

    res.json({
      message: 'Volunteer profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      },
      profile: updatedProfile
    });
  } catch (error) {
    console.error('Error in updateVolunteerProfile:', error);
    res.status(500).json({ message: 'Server error updating volunteer profile' });
  }
};

// @desc    Update volunteer availability status
// @route   PUT /api/volunteers/status
// @access  Private (Volunteer)
const updateAvailabilityStatus = async (req, res) => {
  try {
    const { availabilityStatus } = req.body;

    if (!['available', 'busy', 'offline'].includes(availabilityStatus)) {
      return res.status(400).json({ message: "Invalid status. Must be 'available', 'busy', or 'offline'" });
    }

    let profile = await VolunteerProfile.findOne({ user: req.user._id });
    if (!profile) {
      profile = await VolunteerProfile.create({ user: req.user._id, availabilityStatus });
    } else {
      profile.availabilityStatus = availabilityStatus;
      await profile.save();
    }

    res.json({
      message: `Availability status updated to ${availabilityStatus}`,
      availabilityStatus: profile.availabilityStatus
    });
  } catch (error) {
    console.error('Error in updateAvailabilityStatus:', error);
    res.status(500).json({ message: 'Server error updating availability status' });
  }
};

// @desc    Get available tasks (requested by NGOs, unassigned or pending acceptance)
// @route   GET /api/volunteers/tasks/available
// @access  Private (Volunteer)
const getAvailableTasks = async (req, res) => {
  try {
    const { city, search } = req.query;

    let filter = {
      volunteerRequested: true,
      status: 'accepted',
      $or: [
        { assignedVolunteer: null },
        { assignedVolunteer: { $exists: false } },
        { assignedVolunteer: req.user._id, volunteerStatus: 'assigned' }
      ]
    };

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$and = [
        {
          $or: [
            { 'pickupLocation.city': searchRegex },
            { 'pickupLocation.street': searchRegex },
            { 'dropoffLocation.city': searchRegex },
            { foodType: searchRegex },
            { description: searchRegex }
          ]
        }
      ];
    } else if (city && city.trim()) {
      filter['pickupLocation.city'] = new RegExp(city.trim(), 'i');
    }

    const tasks = await Donation.find(filter)
      .select('-pickupOtp -deliveryOtp')
      .populate('donor', 'name phone email address')
      .populate('acceptedBy', 'name phone email')
      .sort({ createdAt: -1 });

    res.json(tasks);
  } catch (error) {
    console.error('Error in getAvailableTasks:', error);
    res.status(500).json({ message: 'Server error fetching available tasks' });
  }
};

// @desc    Get volunteer's assigned / accepted / completed tasks
// @route   GET /api/volunteers/tasks/my-tasks
// @access  Private (Volunteer)
const getMyTasks = async (req, res) => {
  try {
    const { status } = req.query; // 'active', 'completed', 'all'
    let filter = { assignedVolunteer: req.user._id };

    if (status === 'active') {
      filter.status = { $in: ['assigned', 'picked_up'] };
    } else if (status === 'completed') {
      filter.status = 'delivered';
    }

    const tasks = await Donation.find(filter)
      .select('-pickupOtp -deliveryOtp')
      .populate('donor', 'name phone email address')
      .populate('acceptedBy', 'name phone email')
      .sort({ updatedAt: -1 });

    res.json(tasks);
  } catch (error) {
    console.error('Error in getMyTasks:', error);
    res.status(500).json({ message: 'Server error fetching volunteer tasks' });
  }
};

// @desc    Get specific task details
// @route   GET /api/volunteers/tasks/:id
// @access  Private (Volunteer)
const getTaskById = async (req, res) => {
  try {
    const task = await Donation.findById(req.params.id)
      .select('-pickupOtp -deliveryOtp')
      .populate('donor', 'name phone email address')
      .populate('acceptedBy', 'name phone email');

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check authorization: volunteer must be assigned or task must be openly available
    const isAssigned = task.assignedVolunteer && task.assignedVolunteer.toString() === req.user._id.toString();
    const isAvailable = task.volunteerRequested && task.status === 'accepted' && (!task.assignedVolunteer || isAssigned);

    if (!isAssigned && !isAvailable) {
      return res.status(403).json({ message: 'Not authorized to view this task' });
    }

    res.json(task);
  } catch (error) {
    console.error('Error in getTaskById:', error);
    res.status(500).json({ message: 'Server error fetching task details' });
  }
};

// @desc    Accept a delivery task
// @route   PUT /api/volunteers/tasks/:id/accept
// @access  Private (Volunteer)
const acceptTask = async (req, res) => {
  try {
    const task = await Donation.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (!task.volunteerRequested) {
      return res.status(400).json({ message: 'Volunteer has not been requested for this donation' });
    }

    // Check if another volunteer has already accepted it
    if (
      task.assignedVolunteer &&
      task.assignedVolunteer.toString() !== req.user._id.toString() &&
      task.volunteerStatus === 'accepted'
    ) {
      return res.status(400).json({ message: 'This task has already been accepted by another volunteer' });
    }

    // If task is not in accepted or assigned status
    if (task.status !== 'accepted' && task.status !== 'assigned') {
      return res.status(400).json({ message: `Cannot accept task with status: ${task.status}` });
    }

    // Generate OTPs if not already generated
    if (!task.pickupOtp) {
      task.pickupOtp = generateOtp();
    }
    if (!task.deliveryOtp) {
      task.deliveryOtp = generateOtp();
    }

    // If dropoff location not set, attempt to get it from NGO profile
    if (!task.dropoffLocation || !task.dropoffLocation.street) {
      if (task.acceptedBy) {
        const ngoProfile = await NgoProfile.findOne({ user: task.acceptedBy });
        if (ngoProfile && ngoProfile.address) {
          task.dropoffLocation = {
            street: ngoProfile.address.street || '',
            city: ngoProfile.address.city || '',
            state: ngoProfile.address.state || '',
            zipCode: ngoProfile.address.zipCode || ''
          };
        }
      }
    }

    task.assignedVolunteer = req.user._id;
    task.volunteerStatus = 'accepted';
    task.status = 'assigned';

    await task.save();

    // Update volunteer profile
    let profile = await VolunteerProfile.findOne({ user: req.user._id });
    if (profile) {
      profile.activeDeliveries += 1;
      profile.availabilityStatus = 'busy';
      await profile.save();
    }

    // Fetch populated task without exposing OTPs to volunteer
    const updatedTask = await Donation.findById(task._id)
      .select('-pickupOtp -deliveryOtp')
      .populate('donor', 'name phone email address')
      .populate('acceptedBy', 'name phone email');

    res.json({
      message: 'Task accepted successfully. Please coordinate with the donor for pickup OTP upon arrival.',
      task: updatedTask
    });
  } catch (error) {
    console.error('Error in acceptTask:', error);
    res.status(500).json({ message: 'Server error accepting task' });
  }
};

// @desc    Reject a delivery task
// @route   PUT /api/volunteers/tasks/:id/reject
// @access  Private (Volunteer)
const rejectTask = async (req, res) => {
  try {
    const task = await Donation.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Only assigned volunteer can reject
    if (
      !task.assignedVolunteer ||
      task.assignedVolunteer.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'You are not assigned to this task' });
    }

    // Cannot reject if already picked up
    if (task.status === 'picked_up' || task.status === 'delivered') {
      return res.status(400).json({ message: `Cannot reject task that is already ${task.status}` });
    }

    const wasAccepted = task.volunteerStatus === 'accepted';

    task.assignedVolunteer = null;
    task.volunteerStatus = 'unassigned';
    task.status = 'accepted';
    task.volunteerRequested = true;

    await task.save();

    // Update volunteer profile if it was previously accepted
    if (wasAccepted) {
      let profile = await VolunteerProfile.findOne({ user: req.user._id });
      if (profile) {
        profile.activeDeliveries = Math.max(0, profile.activeDeliveries - 1);
        if (profile.activeDeliveries === 0) {
          profile.availabilityStatus = 'available';
        }
        await profile.save();
      }
    }

    res.json({
      message: 'Task rejected. It is now back in the available pool for other volunteers.',
      taskId: task._id
    });
  } catch (error) {
    console.error('Error in rejectTask:', error);
    res.status(500).json({ message: 'Server error rejecting task' });
  }
};

// @desc    Verify Pickup OTP (provided by Donor to Volunteer)
// @route   POST /api/volunteers/tasks/:id/verify-pickup
// @access  Private (Volunteer)
const verifyPickupOtp = async (req, res) => {
  try {
    const { otp } = req.body;

    if (!otp) {
      return res.status(400).json({ message: 'Please provide the pickup OTP' });
    }

    const task = await Donation.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (
      !task.assignedVolunteer ||
      task.assignedVolunteer.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'Not authorized to perform pickup for this task' });
    }

    if (task.pickupOtpVerified) {
      return res.status(400).json({ message: 'Pickup has already been verified for this task' });
    }

    if (task.pickupOtp !== otp.toString().trim()) {
      return res.status(400).json({ message: 'Invalid pickup OTP. Please verify the code with the donor.' });
    }

    task.pickupOtpVerified = true;
    task.status = 'picked_up';
    task.volunteerStatus = 'in_progress';
    task.pickedUpAt = new Date();

    await task.save();

    const updatedTask = await Donation.findById(task._id)
      .select('-pickupOtp -deliveryOtp')
      .populate('donor', 'name phone email address')
      .populate('acceptedBy', 'name phone email');

    res.json({
      message: 'Pickup OTP verified successfully! Food is marked as picked up and in transit.',
      task: updatedTask
    });
  } catch (error) {
    console.error('Error in verifyPickupOtp:', error);
    res.status(500).json({ message: 'Server error verifying pickup OTP' });
  }
};

// @desc    Upload Delivery Proof (Image and notes)
// @route   POST /api/volunteers/tasks/:id/delivery-proof
// @access  Private (Volunteer)
const uploadDeliveryProof = async (req, res) => {
  try {
    const task = await Donation.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (
      !task.assignedVolunteer ||
      task.assignedVolunteer.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'Not authorized to upload proof for this task' });
    }

    if (!task.pickupOtpVerified) {
      return res.status(400).json({ message: 'Cannot upload delivery proof before food has been picked up' });
    }

    let deliveryProofUrl = task.deliveryProofUrl;
    let deliveryProofPublicId = task.deliveryProofPublicId;

    if (req.file) {
      if (req.file.path && req.file.path.startsWith('http')) {
        deliveryProofUrl = req.file.path;
        deliveryProofPublicId = req.file.filename;
      } else if (req.file.filename) {
        deliveryProofUrl = `/uploads/${req.file.filename}`;
        deliveryProofPublicId = '';
      }
    }

    if (req.body.deliveryNotes !== undefined) {
      task.deliveryNotes = req.body.deliveryNotes;
    }

    task.deliveryProofUrl = deliveryProofUrl;
    task.deliveryProofPublicId = deliveryProofPublicId;

    await task.save();

    const updatedTask = await Donation.findById(task._id)
      .select('-pickupOtp -deliveryOtp')
      .populate('donor', 'name phone email address')
      .populate('acceptedBy', 'name phone email');

    res.json({
      message: 'Delivery proof uploaded successfully',
      task: updatedTask
    });
  } catch (error) {
    console.error('Error in uploadDeliveryProof:', error);
    res.status(500).json({ message: 'Server error uploading delivery proof' });
  }
};

// @desc    Verify Delivery OTP (provided by NGO/Recipient to Volunteer)
// @route   POST /api/volunteers/tasks/:id/verify-delivery
// @access  Private (Volunteer)
const verifyDeliveryOtp = async (req, res) => {
  try {
    const { otp } = req.body;

    if (!otp) {
      return res.status(400).json({ message: 'Please provide the delivery OTP' });
    }

    const task = await Donation.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (
      !task.assignedVolunteer ||
      task.assignedVolunteer.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'Not authorized to perform delivery for this task' });
    }

    if (!task.pickupOtpVerified) {
      return res.status(400).json({ message: 'Pickup must be verified before delivery can be confirmed' });
    }

    if (task.deliveryOtpVerified) {
      return res.status(400).json({ message: 'Delivery OTP has already been verified' });
    }

    if (task.deliveryOtp !== otp.toString().trim()) {
      return res.status(400).json({ message: 'Invalid delivery OTP. Please verify the code with the NGO / dropoff recipient.' });
    }

    task.deliveryOtpVerified = true;
    await task.save();

    const updatedTask = await Donation.findById(task._id)
      .select('-pickupOtp -deliveryOtp')
      .populate('donor', 'name phone email address')
      .populate('acceptedBy', 'name phone email');

    res.json({
      message: 'Delivery OTP verified successfully! You can now finalize task completion.',
      task: updatedTask
    });
  } catch (error) {
    console.error('Error in verifyDeliveryOtp:', error);
    res.status(500).json({ message: 'Server error verifying delivery OTP' });
  }
};

// @desc    Complete delivery task
// @route   PUT /api/volunteers/tasks/:id/complete
// @access  Private (Volunteer)
const completeTask = async (req, res) => {
  try {
    const task = await Donation.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (
      !task.assignedVolunteer ||
      task.assignedVolunteer.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'Not authorized to complete this task' });
    }

    if (task.status === 'delivered') {
      return res.status(400).json({ message: 'Task has already been completed' });
    }

    if (!task.pickupOtpVerified) {
      return res.status(400).json({ message: 'Cannot complete task: Pickup OTP has not been verified' });
    }

    // Check delivery OTP: can be verified in a prior step or passed here in request body
    if (!task.deliveryOtpVerified) {
      if (req.body.deliveryOtp && req.body.deliveryOtp.toString().trim() === task.deliveryOtp) {
        task.deliveryOtpVerified = true;
      } else {
        return res.status(400).json({
          message: 'Cannot complete task: Delivery OTP must be verified first or provided in request body.'
        });
      }
    }

    // If delivery proof file is uploaded with completion
    if (req.file) {
      if (req.file.path && req.file.path.startsWith('http')) {
        task.deliveryProofUrl = req.file.path;
        task.deliveryProofPublicId = req.file.filename;
      } else if (req.file.filename) {
        task.deliveryProofUrl = `/uploads/${req.file.filename}`;
        task.deliveryProofPublicId = '';
      }
    }

    if (req.body.deliveryNotes) {
      task.deliveryNotes = req.body.deliveryNotes;
    }

    task.status = 'delivered';
    task.volunteerStatus = 'completed';
    task.deliveredAt = new Date();

    await task.save();

    // Update volunteer profile statistics
    let profile = await VolunteerProfile.findOne({ user: req.user._id });
    if (profile) {
      profile.completedDeliveries += 1;
      profile.activeDeliveries = Math.max(0, profile.activeDeliveries - 1);
      if (profile.activeDeliveries === 0) {
        profile.availabilityStatus = 'available';
      }
      await profile.save();
    }

    const updatedTask = await Donation.findById(task._id)
      .select('-pickupOtp -deliveryOtp')
      .populate('donor', 'name phone email address')
      .populate('acceptedBy', 'name phone email');

    res.json({
      message: 'Delivery completed successfully! Thank you for your service.',
      task: updatedTask,
      volunteerStats: profile
        ? {
            completedDeliveries: profile.completedDeliveries,
            activeDeliveries: profile.activeDeliveries,
            availabilityStatus: profile.availabilityStatus
          }
        : null
    });
  } catch (error) {
    console.error('Error in completeTask:', error);
    res.status(500).json({ message: 'Server error completing delivery task' });
  }
};

// @desc    Get volunteer dashboard stats
// @route   GET /api/volunteers/stats
// @access  Private (Volunteer)
const getVolunteerStats = async (req, res) => {
  try {
    const profile = await VolunteerProfile.findOne({ user: req.user._id });

    const availableCount = await Donation.countDocuments({
      volunteerRequested: true,
      status: 'accepted',
      $or: [
        { assignedVolunteer: null },
        { assignedVolunteer: { $exists: false } },
        { assignedVolunteer: req.user._id, volunteerStatus: 'assigned' }
      ]
    });

    const activeCount = await Donation.countDocuments({
      assignedVolunteer: req.user._id,
      status: { $in: ['assigned', 'picked_up'] }
    });

    const completedCount = await Donation.countDocuments({
      assignedVolunteer: req.user._id,
      status: 'delivered'
    });

    res.json({
      stats: {
        completedDeliveries: profile ? profile.completedDeliveries : completedCount,
        activeDeliveries: activeCount,
        availableTasks: availableCount,
        availabilityStatus: profile ? profile.availabilityStatus : 'available',
        rating: profile ? profile.rating : 5.0,
        ratingCount: profile ? (profile.ratingCount || 0) : 0,
        ratings: profile ? (profile.ratings || []) : []
      }
    });
  } catch (error) {
    console.error('Error in getVolunteerStats:', error);
    res.status(500).json({ message: 'Server error fetching stats' });
  }
};

module.exports = {
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
  getVolunteerStats
};

const Donation = require('../models/Donation');
const VolunteerProfile = require('../models/VolunteerProfile');
const NgoProfile = require('../models/NgoProfile');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { generateOtp } = require('../utils/otpUtils');
const { sanitizeDonationForUser, isValidDonationTransition } = require('../utils/stateMachine');
const sendEmail = require('../utils/sendEmail');
const emailTemplates = require('../utils/emailTemplates');

// @desc    Get volunteer profile
// @route   GET /api/volunteers/profile
// @access  Private (Volunteer)
const getVolunteerProfile = async (req, res) => {
  try {
    let profile = await VolunteerProfile.findOne({ user: req.user._id })
      .populate('associatedNgo', 'name email phone address')
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

    const volProfile = await VolunteerProfile.findOne({ user: req.user._id });

    let filter = {
      volunteerRequested: true,
      status: 'accepted',
      $or: [
        { assignedVolunteer: null },
        { assignedVolunteer: { $exists: false } },
        { assignedVolunteer: req.user._id, volunteerStatus: 'assigned' }
      ]
    };

    // If volunteer is affiliated with an NGO, only show tasks from their organization
    if (volProfile && volProfile.associatedNgo) {
      filter.acceptedBy = volProfile.associatedNgo;
    }

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
      .populate('acceptedBy', 'name phone email address')
      .sort({ createdAt: -1 });

    const enriched = await enrichTasksWithNgoDetails(tasks);
    res.json(enriched);
  } catch (error) {
    console.error('Error in getAvailableTasks:', error);
    res.status(500).json({ message: 'Server error fetching available tasks' });
  }
};

// Helper function to enrich donation tasks with complete NGO organization details
const enrichTasksWithNgoDetails = async (tasks) => {
  if (!tasks || tasks.length === 0) return tasks;
  const ngoUserIds = tasks.map((t) => t.acceptedBy?._id || t.acceptedBy).filter(Boolean);
  if (ngoUserIds.length === 0) return tasks;

  const profiles = await NgoProfile.find({ user: { $in: ngoUserIds } }).lean();
  const profileMap = new Map();
  profiles.forEach((p) => profileMap.set(p.user.toString(), p));

  return tasks.map((t) => {
    const taskObj = t.toObject ? t.toObject() : { ...t };
    const ngoUserId = taskObj.acceptedBy?._id
      ? taskObj.acceptedBy._id.toString()
      : taskObj.acceptedBy
      ? taskObj.acceptedBy.toString()
      : null;

    if (ngoUserId && profileMap.has(ngoUserId)) {
      const ngoProf = profileMap.get(ngoUserId);
      taskObj.ngoOrganization = {
        organizationName: ngoProf.organizationName || 'NGO Community Partner',
        registrationNumber: ngoProf.registrationNumber,
        address: ngoProf.address,
        description: ngoProf.description,
        website: ngoProf.website,
      };

      // Enrich dropoffLocation with the organization's street and landmark
      const street = taskObj.dropoffLocation?.street && taskObj.dropoffLocation.street !== 'Nadiad'
        ? taskObj.dropoffLocation.street
        : (ngoProf.address?.street || taskObj.acceptedBy?.address || 'Community Relief Center');
      const city = taskObj.dropoffLocation?.city || ngoProf.address?.city || 'Nadiad';
      const state = taskObj.dropoffLocation?.state || ngoProf.address?.state || 'Gujarat';
      const zipCode = taskObj.dropoffLocation?.zipCode || ngoProf.address?.zipCode || '';

      taskObj.dropoffLocation = {
        street,
        city,
        state,
        zipCode,
      };
    } else if (taskObj.acceptedBy) {
      taskObj.ngoOrganization = {
        organizationName: taskObj.acceptedBy.name ? `${taskObj.acceptedBy.name} Relief Foundation` : 'NGO Partner',
        address: { street: taskObj.acceptedBy.address || '', city: 'Nadiad' }
      };
      if (!taskObj.dropoffLocation || !taskObj.dropoffLocation.street || taskObj.dropoffLocation.street === 'Nadiad') {
        taskObj.dropoffLocation = {
          street: taskObj.acceptedBy.address || 'Civil Hospital Road',
          city: 'Nadiad',
          state: 'Gujarat',
          zipCode: ''
        };
      }
    }
    return taskObj;
  });
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
      .populate('acceptedBy', 'name phone email address')
      .sort({ updatedAt: -1 });

    const enriched = await enrichTasksWithNgoDetails(tasks);
    res.json(enriched);
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
      .populate('acceptedBy', 'name phone email address');

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check authorization: volunteer must be assigned or task must be openly available
    const isAssigned = task.assignedVolunteer && task.assignedVolunteer.toString() === req.user._id.toString();
    const isAvailable = task.volunteerRequested && task.status === 'accepted' && (!task.assignedVolunteer || isAssigned);

    if (!isAssigned && !isAvailable) {
      return res.status(403).json({ message: 'Not authorized to view this task' });
    }

    const [enrichedTask] = await enrichTasksWithNgoDetails([task]);
    res.json(enrichedTask);
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

    // Case 3 & 9: If this volunteer already accepted this task, respond idempotently
    if (
      task.assignedVolunteer &&
      task.assignedVolunteer.toString() === req.user._id.toString() &&
      task.volunteerStatus === 'accepted'
    ) {
      const existingTask = await Donation.findById(task._id)
        .select('-pickupOtp -deliveryOtp')
        .populate('donor', 'name phone email address')
        .populate('acceptedBy', 'name phone email');
      return res.status(200).json({
        message: 'Task already accepted by you.',
        task: existingTask
      });
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
      return res.status(409).json({ message: 'This task has already been accepted by another volunteer' });
    }

    // If task is not in accepted or assigned status
    if (task.status !== 'accepted' && task.status !== 'assigned') {
      return res.status(400).json({ message: `Cannot accept task with status: ${task.status}` });
    }

    // Case 2: Ensure task hasn't expired
    if (task.expiresAt && task.expiresAt <= new Date()) {
      return res.status(400).json({ message: 'Cannot accept task: donation pickup window has expired.' });
    }

    // Case 38: Volunteer capacity check (max 3 concurrent active deliveries)
    const existingVolProfile = await VolunteerProfile.findOne({ user: req.user._id });
    if (existingVolProfile && (existingVolProfile.activeDeliveries || 0) >= 3) {
      return res.status(400).json({
        message: 'You have reached the maximum concurrent active deliveries limit (3). Please complete an active task first.'
      });
    }

    // Prepare dropoff location if not present
    let dropoffLocation = task.dropoffLocation;
    if (!dropoffLocation || !dropoffLocation.street) {
      if (task.acceptedBy) {
        const ngoProfile = await NgoProfile.findOne({ user: task.acceptedBy });
        if (ngoProfile && ngoProfile.address) {
          dropoffLocation = {
            street: ngoProfile.address.street || '',
            city: ngoProfile.address.city || '',
            state: ngoProfile.address.state || '',
            zipCode: ngoProfile.address.zipCode || ''
          };
        }
      }
    }

    // Case 1 & 3: Atomic update to prevent two volunteers claiming simultaneously
    const updatedTask = await Donation.findOneAndUpdate(
      {
        _id: req.params.id,
        volunteerRequested: true,
        status: { $in: ['accepted', 'assigned'] },
        $or: [
          { assignedVolunteer: null },
          { assignedVolunteer: { $exists: false } },
          { assignedVolunteer: req.user._id }
        ]
      },
      {
        $set: {
          assignedVolunteer: req.user._id,
          volunteerStatus: 'accepted',
          status: 'assigned',
          pickupOtp: task.pickupOtp || generateOtp(),
          deliveryOtp: task.deliveryOtp || generateOtp(),
          ...(dropoffLocation ? { dropoffLocation } : {})
        },
        $push: {
          timeline: { status: 'assigned', description: 'Volunteer accepted the pickup task', time: new Date() }
        }
      },
      { new: true }
    );

    if (!updatedTask) {
      return res.status(409).json({ message: 'This task was already claimed by another volunteer.' });
    }

    // Update volunteer profile safely
    try {
      let profile = await VolunteerProfile.findOne({ user: req.user._id });
      if (profile) {
        profile.activeDeliveries = (profile.activeDeliveries || 0) + 1;
        profile.availabilityStatus = 'busy';
        await profile.save();
      }
    } catch (profileErr) {
      console.error('[VolunteerProfileError] Error updating activeDeliveries:', profileErr.message);
    }

    // Case 8: Notification safe execution
    try {
      await Notification.create({
        user: updatedTask.donor,
        message: 'A volunteer has accepted the pickup task for your donation.',
        type: 'donation_status',
        relatedDonation: updatedTask._id
      });
    } catch (notifErr) {
      console.error('[NotificationError] Error creating volunteer accepted notification:', notifErr.message);
    }

    // Fetch populated task without exposing OTPs to volunteer
    const populated = await Donation.findById(updatedTask._id)
      .select('-pickupOtp -deliveryOtp')
      .populate('donor', 'name phone email address')
      .populate('acceptedBy', 'name phone email');

    res.json({
      message: 'Task accepted successfully. Please coordinate with the donor for pickup OTP upon arrival.',
      task: populated
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
    task.timeline.push({ status: 'accepted', description: 'Volunteer rejected the pickup task' });

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

    // Case 13: Notify NGO partner that volunteer rejected/released the task
    if (task.acceptedBy) {
      try {
        await Notification.create({
          user: task.acceptedBy,
          message: `Volunteer ${req.user.name} released pickup task for "${task.foodType}". It has been returned to the available pool.`,
          type: 'volunteer_assignment',
          relatedDonation: task._id
        });
      } catch (err) {}
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
      const alreadyVerified = await Donation.findById(task._id)
        .select('-pickupOtp -deliveryOtp')
        .populate('donor', 'name phone email address')
        .populate('acceptedBy', 'name phone email');
      return res.status(200).json({
        message: 'Pickup has already been verified for this task.',
        task: alreadyVerified
      });
    }

    // Case 21 & 22: Brute-force & Wrong OTP limit (max 5 attempts)
    if ((task.pickupOtpAttempts || 0) >= 5) {
      return res.status(429).json({
        message: 'Too many incorrect pickup OTP attempts (5/5). Pickup verification is locked for security. Please request a new code or contact support.'
      });
    }

    if (task.pickupOtp !== otp.toString().trim()) {
      task.pickupOtpAttempts = (task.pickupOtpAttempts || 0) + 1;
      await task.save();
      const remaining = 5 - task.pickupOtpAttempts;
      return res.status(400).json({
        message: `Invalid pickup OTP. ${remaining} attempt(s) remaining before verification lock.`
      });
    }

    task.pickupOtpVerified = true;
    task.status = 'picked_up';
    task.volunteerStatus = 'in_progress';
    task.pickedUpAt = new Date();
    task.timeline.push({ status: 'picked_up', description: 'Donation picked up by volunteer' });

    await task.save();

    // Case 8: Notification & email safety
    try {
      await Notification.create({
        user: task.donor,
        message: 'Your donation has been picked up by the volunteer!',
        type: 'donation_status',
        relatedDonation: task._id
      });
    } catch (notifErr) {
      console.error('[NotificationError] Error creating pickup notification:', notifErr.message);
    }

    try {
      const donorUser = await User.findById(task.donor);
      if (donorUser?.email) {
        const tpl = emailTemplates.donationPickedUp({
          donorName: donorUser.name,
          foodType: task.foodType,
          volunteerName: req.user.name,
          donationId: task._id.toString()
        });
        sendEmail({ email: donorUser.email, subject: tpl.subject, html: tpl.html, message: tpl.text }).catch(() => {});
      }
    } catch (emailErr) {
      console.error('[EmailError] Error sending pickup email:', emailErr.message);
    }

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

    // Case 21 & 22: Brute-force & Wrong OTP limit (max 5 attempts)
    if ((task.deliveryOtpAttempts || 0) >= 5) {
      return res.status(429).json({
        message: 'Too many incorrect delivery OTP attempts (5/5). Delivery verification locked for security.'
      });
    }

    if (task.deliveryOtp !== otp.toString().trim()) {
      task.deliveryOtpAttempts = (task.deliveryOtpAttempts || 0) + 1;
      await task.save();
      const remaining = 5 - task.deliveryOtpAttempts;
      return res.status(400).json({
        message: `Invalid delivery OTP. ${remaining} attempt(s) remaining before verification lock.`
      });
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

    // Case 9: Double-click idempotency
    if (task.status === 'delivered') {
      const alreadyDelivered = await Donation.findById(task._id)
        .select('-pickupOtp -deliveryOtp')
        .populate('donor', 'name phone email address')
        .populate('acceptedBy', 'name phone email');
      return res.status(200).json({
        message: 'Task has already been completed.',
        task: alreadyDelivered
      });
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
    task.timeline.push({ status: 'delivered', description: 'Donation delivered by volunteer' });

    await task.save();

    // Case 8: Notification resilience
    try {
      await Notification.create({
        user: task.donor,
        message: 'Your donation has been delivered successfully!',
        type: 'donation_status',
        relatedDonation: task._id
      });
    } catch (notifErr) {
      console.error('[NotificationError] Error creating delivery notification:', notifErr.message);
    }

    // Update volunteer profile statistics safely
    let profile = null;
    try {
      profile = await VolunteerProfile.findOne({ user: req.user._id });
      if (profile) {
        profile.completedDeliveries = (profile.completedDeliveries || 0) + 1;
        profile.activeDeliveries = Math.max(0, (profile.activeDeliveries || 1) - 1);
        if (profile.activeDeliveries === 0) {
          profile.availabilityStatus = 'available';
        }
        await profile.save();
      }
    } catch (profileErr) {
      console.error('[VolunteerProfileError] Error updating delivery stats:', profileErr.message);
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

    let availableFilter = {
      volunteerRequested: true,
      status: 'accepted',
      $or: [
        { assignedVolunteer: null },
        { assignedVolunteer: { $exists: false } },
        { assignedVolunteer: req.user._id, volunteerStatus: 'assigned' }
      ]
    };

    if (profile && profile.associatedNgo) {
      availableFilter.acceptedBy = profile.associatedNgo;
    }

    const availableCount = await Donation.countDocuments(availableFilter);

    const activeCount = await Donation.countDocuments({
      assignedVolunteer: req.user._id,
      status: { $in: ['assigned', 'picked_up'] }
    });

    const completedCount = await Donation.countDocuments({
      assignedVolunteer: req.user._id,
      status: 'delivered'
    });

    // Ensure profile counter is in sync with verified completed records
    if (profile && profile.completedDeliveries !== completedCount) {
      profile.completedDeliveries = completedCount;
      await profile.save();
    }

    res.json({
      stats: {
        completedDeliveries: completedCount,
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

// @desc    Update volunteer live location for an active task
// @route   PUT /api/volunteers/tasks/:id/location
// @access  Private (Volunteer)
const updateTaskLocation = async (req, res) => {
  try {
    const { lat, lng, heading, speed, address } = req.body;
    const task = await Donation.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (!task.assignedVolunteer || task.assignedVolunteer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized for this task' });
    }

    task.volunteerLocation = {
      lat: Number(lat),
      lng: Number(lng),
      heading: Number(heading) || 0,
      speed: Number(speed) || 0,
      address: address || '',
      updatedAt: new Date()
    };

    await task.save();

    res.json({
      message: 'Location updated successfully',
      volunteerLocation: task.volunteerLocation
    });
  } catch (error) {
    console.error('Error in updateTaskLocation:', error);
    res.status(500).json({ message: 'Server error updating location' });
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
  getVolunteerStats,
  updateTaskLocation
};

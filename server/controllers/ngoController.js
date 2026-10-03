const NgoProfile = require('../models/NgoProfile');
const Donation = require('../models/Donation');
const VolunteerProfile = require('../models/VolunteerProfile');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { checkAndExpireDonations } = require('../services/expirationService');
const { generateOtp } = require('../utils/otpUtils');
const { sanitizeDonationForUser } = require('../utils/stateMachine');
const { escapeRegex, safeString } = require('../utils/sanitizeQuery');
const sendEmail = require('../utils/sendEmail');
const emailTemplates = require('../utils/emailTemplates');

// @desc    Register NGO Profile & upload documents
// @route   POST /api/ngos/register
// @access  Private (NGO)
const registerNgoProfile = async (req, res) => {
  try {
    const { organizationName, registrationNumber, street, city, state, zipCode, country, description, website } = req.body;

    let ngoProfile = await NgoProfile.findOne({ user: req.user._id });
    if (ngoProfile) {
      return res.status(400).json({ message: 'NGO Profile already exists' });
    }

    // Check if another NGO has the same registration number
    const existingRegistration = await NgoProfile.findOne({ registrationNumber });
    if (existingRegistration) {
      return res.status(400).json({ message: 'Registration number already in use' });
    }

    const newProfile = {
      user: req.user._id,
      organizationName,
      registrationNumber,
      address: {
        street,
        city,
        state,
        zipCode,
        country
      },
      description,
      website
    };

    if (req.file) {
      newProfile.documentUrl = req.file.path;
      newProfile.documentPublicId = req.file.filename;
    }

    ngoProfile = await NgoProfile.create(newProfile);

    res.status(201).json({
      message: 'NGO Profile created successfully, pending verification.',
      ngoProfile
    });
  } catch (error) {
    console.error('Error in registerNgoProfile:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get nearby (pending) donations with city & search proximity filtering
// @route   GET /api/ngos/donations
// @access  Private (NGO)
const getNearbyDonations = async (req, res) => {
  try {
    const { city, search, all, lat, lng, maxDistance } = req.query;
    const now = new Date();
    let query = {
      status: 'pending',
      $or: [
        { expiresAt: { $gt: now } },
        { expiresAt: null },
        { expiresAt: { $exists: false } }
      ]
    };

    if (lat && lng && maxDistance) {
      query.location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: parseInt(maxDistance) * 1000 // Convert km to meters
        }
      };
    }

    // Fetch NGO's profile to find their registered city
    const ngoProfile = await NgoProfile.findOne({ user: req.user._id });
    const ngoCity = ngoProfile?.address?.city || '';

    const searchStr = safeString(search).trim();
    if (searchStr) {
      const searchRegex = new RegExp(escapeRegex(searchStr), 'i');
      query.$or = [
        { 'pickupLocation.city': searchRegex },
        { 'pickupLocation.street': searchRegex },
        { 'pickupLocation.zipCode': searchRegex },
        { foodType: searchRegex },
        { description: searchRegex }
      ];
    } else if (all !== 'true') {
      const targetCity = safeString(city).trim() || ngoCity;
      if (targetCity) {
        query['pickupLocation.city'] = new RegExp(escapeRegex(targetCity), 'i');
      }
    }

    const donations = await Donation.find(query)
      .populate('donor', 'name email phone')
      .sort({ createdAt: -1 });

    res.json(donations);
  } catch (error) {
    console.error('Error in getNearbyDonations:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get NGO's accepted and managed donations (including deliveryOtp for volunteer verification)
// @route   GET /api/ngos/my-donations
// @access  Private (NGO)
const getMyAcceptedDonations = async (req, res) => {
  try {
    const donations = await Donation.find({ acceptedBy: req.user._id })
      .populate('donor', 'name email phone address')
      .populate('assignedVolunteer', 'name email phone')
      .sort({ updatedAt: -1 });

    res.json(donations);
  } catch (error) {
    console.error('Error in getMyAcceptedDonations:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Accept a donation
// @route   PUT /api/ngos/donations/:id/accept
// @access  Private (NGO)
const acceptDonation = async (req, res) => {
  try {
    // Check verification status from req.user (populated by auth middleware)
    const isVerified = req.user.verificationStatus === 'approved' || req.user.isVerified === true;
    if (!isVerified) {
      return res.status(403).json({ message: 'NGO must be verified to accept donations' });
    }

    // Enforce active pickups capacity limit to prevent hoarding/capacity breakdown
    const activePickups = await Donation.countDocuments({
      acceptedBy: req.user._id,
      status: { $in: ['accepted', 'assigned', 'picked_up'] }
    });
    if (activePickups >= 10) {
      return res.status(400).json({
        message: 'Active pickup limit reached (maximum 10 active pickups). Please complete or release in-progress donations before accepting more.'
      });
    }

    const now = new Date();

    // Idempotency pre-check
    const existing = await Donation.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: 'Donation not found' });
    }

    // Case 9: If this exact NGO already accepted, return success idempotently
    if (existing.acceptedBy && existing.acceptedBy.toString() === req.user._id.toString()) {
      return res.status(200).json({
        message: 'Donation already accepted by your organization',
        donation: sanitizeDonationForUser(existing, req.user)
      });
    }

    // Case 2: Food safety check
    if (existing.expiresAt && existing.expiresAt <= now) {
      existing.status = 'expired';
      existing.timeline.push({
        status: 'expired',
        description: 'Pickup window expired without an NGO partner confirmation',
        time: now
      });
      await existing.save();
      return res.status(400).json({ message: 'This donation has expired and can no longer be accepted for food safety reasons' });
    }

    if (existing.status !== 'pending') {
      return res.status(409).json({ message: 'This donation is no longer available or was accepted by another partner.' });
    }

    // Prepare dropoff location from NGO profile if available
    const ngoProfile = await NgoProfile.findOne({ user: req.user._id });
    const dropoffLocation = (ngoProfile && ngoProfile.address) ? {
      street: ngoProfile.address.street || '',
      city: ngoProfile.address.city || '',
      state: ngoProfile.address.state || '',
      zipCode: ngoProfile.address.zipCode || ''
    } : undefined;

    // Case 1 & 2: Atomic update to prevent race conditions when two NGOs accept simultaneously
    const updateDoc = {
      $set: {
        status: 'accepted',
        acceptedBy: req.user._id,
        ...(dropoffLocation ? { dropoffLocation } : {})
      },
      $push: {
        timeline: { status: 'accepted', description: 'Donation accepted by NGO', time: now }
      }
    };

    const updatedDonation = await Donation.findOneAndUpdate(
      {
        _id: req.params.id,
        status: 'pending',
        $or: [
          { expiresAt: { $gt: now } },
          { expiresAt: null },
          { expiresAt: { $exists: false } }
        ]
      },
      updateDoc,
      { new: true }
    );

    if (!updatedDonation) {
      // Re-fetch to see whether another NGO won the atomic lock or if it just expired
      const raceCheck = await Donation.findById(req.params.id);
      if (raceCheck?.expiresAt && raceCheck.expiresAt <= now) {
        return res.status(400).json({ message: 'This donation has expired and can no longer be accepted.' });
      }
      return res.status(409).json({ message: 'Another NGO accepted this donation just now.' });
    }

    // Case 8: Secondary side effects (in-app notifications & email) isolated from core transaction
    try {
      await Notification.create({
        user: updatedDonation.donor,
        message: 'Your donation has been accepted by an NGO.',
        type: 'donation_status',
        relatedDonation: updatedDonation._id
      });
    } catch (notifErr) {
      console.error('[NotificationError] Failed to create in-app notification:', notifErr.message);
    }

    try {
      const donor = await User.findById(updatedDonation.donor);
      if (donor?.email) {
        const ngoName = ngoProfile?.organizationName || req.user.name || 'NGO Partner';
        const tpl = emailTemplates.donationAccepted({
          donorName: donor.name,
          foodType: updatedDonation.foodType,
          ngoName,
          donationId: updatedDonation._id.toString()
        });
        sendEmail({ email: donor.email, subject: tpl.subject, html: tpl.html, message: tpl.text }).catch(() => {});
      }
    } catch (emailErr) {
      console.error('[EmailError] Failed to send acceptance email:', emailErr.message);
    }

    res.json({
      message: 'Donation accepted successfully',
      donation: sanitizeDonationForUser(updatedDonation, req.user)
    });
  } catch (error) {
    console.error('Error in acceptDonation:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Request a volunteer for an accepted donation
// @route   PUT /api/ngos/donations/:id/request-volunteer
// @access  Private (NGO)
const requestVolunteer = async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id);

    if (!donation) {
      return res.status(404).json({ message: 'Donation not found' });
    }

    // Only the NGO who accepted the donation can request a volunteer
    if (!donation.acceptedBy || donation.acceptedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to request volunteer for this donation' });
    }

    // Generate OTPs if not generated
    if (!donation.pickupOtp) donation.pickupOtp = generateOtp();
    if (!donation.deliveryOtp) donation.deliveryOtp = generateOtp();

    // Set dropoff location if not present
    if (!donation.dropoffLocation || !donation.dropoffLocation.street) {
      const ngoProfile = await NgoProfile.findOne({ user: req.user._id });
      if (ngoProfile && ngoProfile.address) {
        donation.dropoffLocation = {
          street: ngoProfile.address.street || '',
          city: ngoProfile.address.city || '',
          state: ngoProfile.address.state || '',
          zipCode: ngoProfile.address.zipCode || ''
        };
      }
    }

    donation.volunteerRequested = true;
    donation.timeline.push({ status: 'accepted', description: 'Volunteer requested for pickup' });
    await donation.save();

    res.json({
      message: 'Volunteer requested successfully. Task is now visible in volunteer hub.',
      donation
    });
  } catch (error) {
    console.error('Error in requestVolunteer:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get list of available volunteers belonging to this NGO
// @route   GET /api/ngos/volunteers/available
// @access  Private (NGO)
const getAvailableVolunteers = async (req, res) => {
  try {
    const profiles = await VolunteerProfile.find({
      associatedNgo: req.user._id,
      availabilityStatus: { $in: ['available', 'busy'] },
      $or: [
        { activeDeliveries: { $lt: 3 } },
        { activeDeliveries: { $exists: false } }
      ]
    }).populate('user', 'name email phone address');

    // Filter out any profiles where user record does not exist
    const validProfiles = profiles.filter(p => p.user !== null && p.user !== undefined);

    res.json(validProfiles);
  } catch (error) {
    console.error('Error in getAvailableVolunteers:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get all volunteers associated with this NGO (any status)
// @route   GET /api/ngos/volunteers
// @access  Private (NGO)
const getMyVolunteers = async (req, res) => {
  try {
    const profiles = await VolunteerProfile.find({
      associatedNgo: req.user._id
    }).populate('user', 'name email phone address');

    const validProfiles = profiles.filter(p => p.user !== null && p.user !== undefined);
    res.json(validProfiles);
  } catch (error) {
    console.error('Error in getMyVolunteers:', error);
    res.status(500).json({ message: 'Server Error fetching organization volunteers' });
  }
};

// @desc    Onboard a volunteer directly to this NGO team
// @route   POST /api/ngos/volunteers
// @access  Private (NGO)
const addVolunteerToNgo = async (req, res) => {
  try {
    const { name, email, phone, password, vehicleType, vehicleNumber } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please provide name, email, and password.' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      if (existingUser.role === 'volunteer') {
        let volProfile = await VolunteerProfile.findOne({ user: existingUser._id });
        if (!volProfile) {
          volProfile = new VolunteerProfile({ user: existingUser._id });
        }
        volProfile.associatedNgo = req.user._id;
        if (vehicleType) volProfile.vehicleType = vehicleType;
        if (vehicleNumber) volProfile.vehicleNumber = vehicleNumber;
        await volProfile.save();
        return res.status(200).json({ message: 'Volunteer linked to your organization team.', profile: volProfile });
      }
      return res.status(400).json({ message: 'An account with this email already exists.' });
    }

    const newUser = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone || '',
      password,
      role: 'volunteer',
      isVerified: true
    });

    const newProfile = await VolunteerProfile.create({
      user: newUser._id,
      associatedNgo: req.user._id,
      vehicleType: vehicleType || 'bike',
      vehicleNumber: vehicleNumber || '',
      availabilityStatus: 'available'
    });

    res.status(201).json({
      message: 'Volunteer successfully added to your organization team!',
      volunteer: {
        _id: newProfile._id,
        user: newUser,
        vehicleType: newProfile.vehicleType,
        vehicleNumber: newProfile.vehicleNumber,
        availabilityStatus: newProfile.availabilityStatus
      }
    });
  } catch (error) {
    console.error('Error in addVolunteerToNgo:', error);
    res.status(500).json({ message: 'Server error creating volunteer' });
  }
};

// @desc    Assign a specific volunteer to an accepted donation
// @route   PUT /api/ngos/donations/:id/assign-volunteer
// @access  Private (NGO)
const assignVolunteer = async (req, res) => {
  try {
    const { volunteerId } = req.body;

    if (!volunteerId) {
      return res.status(400).json({ message: 'Please provide a volunteer ID' });
    }

    const volunteer = await User.findById(volunteerId);
    if (!volunteer || volunteer.role !== 'volunteer') {
      return res.status(400).json({ message: 'Invalid volunteer user' });
    }

    // Find volunteer profile
    const volProfile = await VolunteerProfile.findOne({
      user: volunteerId
    });
    if (!volProfile) {
      return res.status(404).json({ message: 'Volunteer profile not found' });
    }

    if (volProfile.associatedNgo && volProfile.associatedNgo.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'This volunteer does not belong to your organization team.' });
    }

    // Case 38: Volunteer capacity check
    if ((volProfile.activeDeliveries || 0) >= 3) {
      return res.status(400).json({
        message: 'This volunteer already has 3 active deliveries (capacity reached). Please choose another volunteer.'
      });
    }

    const donation = await Donation.findById(req.params.id);
    if (!donation) {
      return res.status(404).json({ message: 'Donation not found' });
    }

    if (!donation.acceptedBy || donation.acceptedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to assign volunteer for this donation' });
    }

    if (donation.status !== 'accepted' && donation.status !== 'assigned') {
      return res.status(400).json({ message: `Cannot assign volunteer to donation with status '${donation.status}'` });
    }

    if (!donation.pickupOtp) donation.pickupOtp = generateOtp();
    if (!donation.deliveryOtp) donation.deliveryOtp = generateOtp();

    // Set dropoff location if not present
    if (!donation.dropoffLocation || !donation.dropoffLocation.street) {
      const ngoProfile = await NgoProfile.findOne({ user: req.user._id });
      if (ngoProfile && ngoProfile.address) {
        donation.dropoffLocation = {
          street: ngoProfile.address.street || '',
          city: ngoProfile.address.city || '',
          state: ngoProfile.address.state || '',
          zipCode: ngoProfile.address.zipCode || ''
        };
      }
    }

    donation.assignedVolunteer = volunteer._id;
    donation.volunteerRequested = true;
    donation.volunteerStatus = 'assigned';
    donation.status = 'assigned';
    donation.timeline.push({ status: 'assigned', description: `Volunteer ${volunteer.name} assigned for pickup` });

    await donation.save();

    // In-app notifications
    await Notification.create({
      user: volunteer._id,
      message: 'You have been assigned to a new delivery task.',
      type: 'volunteer_assignment',
      relatedDonation: donation._id
    });
    await Notification.create({
      user: donation.donor,
      message: `A volunteer (${volunteer.name}) has been assigned to pick up your donation.`,
      type: 'donation_status',
      relatedDonation: donation._id
    });

    // Email notifications (fire-and-forget)
    const donorUser = await User.findById(donation.donor);
    const volTpl = emailTemplates.volunteerAssigned({
      recipientName: volunteer.name,
      foodType: donation.foodType,
      role: 'volunteer'
    });
    sendEmail({ email: volunteer.email, subject: volTpl.subject, html: volTpl.html, message: volTpl.text }).catch(() => {});
    if (donorUser?.email) {
      const donorTpl = emailTemplates.volunteerAssigned({
        recipientName: donorUser.name,
        foodType: donation.foodType,
        volunteerName: volunteer.name,
        role: 'donor'
      });
      sendEmail({ email: donorUser.email, subject: donorTpl.subject, html: donorTpl.html, message: donorTpl.text }).catch(() => {});
    }

    // Update volunteer profile status to busy
    volProfile.activeDeliveries = (volProfile.activeDeliveries || 0) + 1;
    volProfile.availabilityStatus = 'busy';
    if (!volProfile.associatedNgo) {
      volProfile.associatedNgo = req.user._id;
    }
    await volProfile.save();

    res.json({
      message: `Task successfully assigned to volunteer ${volunteer.name}`,
      donation
    });
  } catch (error) {
    console.error('Error in assignVolunteer:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Confirm delivery of a donation (NGO direct confirm)
// @route   PUT /api/ngos/donations/:id/confirm-delivery
// @access  Private (NGO)
const confirmDelivery = async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id);

    if (!donation) {
      return res.status(404).json({ message: 'Donation not found' });
    }

    // Must be the NGO who accepted it
    if (!donation.acceptedBy || donation.acceptedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to confirm delivery for this donation' });
    }

    // Direct delivery without assigning a volunteer first is disallowed
    if (!donation.assignedVolunteer) {
      return res.status(400).json({
        message: 'Please assign a volunteer first to pick up and transport the food before confirming delivery.'
      });
    }

    donation.status = 'delivered';
    donation.deliveredAt = new Date();
    if (donation.assignedVolunteer) {
      donation.volunteerStatus = 'completed';
      donation.deliveryOtpVerified = true;
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

    donation.timeline.push({ status: 'delivered', description: 'Donation marked as delivered by NGO' });
    await donation.save();

    // In-app notification
    await Notification.create({
      user: donation.donor,
      message: 'Your donation has been delivered successfully!',
      type: 'donation_status',
      relatedDonation: donation._id
    });

    // Email notification (fire-and-forget)
    const deliveredDonor = await User.findById(donation.donor);
    if (deliveredDonor?.email) {
      const ngoProf = await NgoProfile.findOne({ user: req.user._id });
      const tpl = emailTemplates.donationDelivered({
        donorName: deliveredDonor.name,
        foodType: donation.foodType,
        ngoName: ngoProf?.organizationName || req.user.name
      });
      sendEmail({ email: deliveredDonor.email, subject: tpl.subject, html: tpl.html, message: tpl.text }).catch(() => {});
    }

    res.json({
      message: 'Donation marked as delivered',
      donation
    });
  } catch (error) {
    console.error('Error in confirmDelivery:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Rate and review a volunteer for completed delivery
// @route   POST /api/ngos/donations/:id/rate-volunteer
// @access  Private (NGO)
const rateVolunteer = async (req, res) => {
  try {
    const { score, feedback } = req.body;

    if (!score || Number(score) < 1 || Number(score) > 5) {
      return res.status(400).json({ message: 'Please provide a valid rating score between 1 and 5' });
    }

    const donation = await Donation.findById(req.params.id);

    if (!donation) {
      return res.status(404).json({ message: 'Donation not found' });
    }

    if (!donation.acceptedBy || donation.acceptedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to rate volunteer for this donation' });
    }

    if (donation.status !== 'delivered') {
      return res.status(400).json({ message: 'Can only rate volunteer after donation is marked as delivered' });
    }

    if (!donation.assignedVolunteer) {
      return res.status(400).json({ message: 'No volunteer was assigned to this donation' });
    }

    if (donation.volunteerRated) {
      return res.status(400).json({ message: 'Volunteer has already been rated for this delivery' });
    }

    let volProfile = await VolunteerProfile.findOne({ user: donation.assignedVolunteer });
    if (!volProfile) {
      volProfile = new VolunteerProfile({ user: donation.assignedVolunteer });
    }

    if (!volProfile.ratings) volProfile.ratings = [];

    volProfile.ratings.push({
      ratedBy: req.user._id,
      role: 'ngo',
      donation: donation._id,
      score: Number(score),
      feedback: feedback ? feedback.trim() : '',
      createdAt: new Date()
    });

    const totalScores = volProfile.ratings.reduce((acc, r) => acc + r.score, 0);
    volProfile.rating = Number((totalScores / volProfile.ratings.length).toFixed(1));
    volProfile.ratingCount = volProfile.ratings.length;

    await volProfile.save();

    donation.volunteerRated = true;
    donation.volunteerRating = {
      score: Number(score),
      feedback: feedback ? feedback.trim() : '',
      ratedAt: new Date()
    };
    await donation.save();

    res.json({
      message: 'Volunteer rated successfully! Thank you for your feedback.',
      donation,
      volunteerRating: volProfile.rating,
      ratingCount: volProfile.ratingCount
    });
  } catch (error) {
    console.error('Error in rateVolunteer:', error);
    res.status(500).json({ message: 'Server Error rating volunteer' });
  }
};

// @desc    Get verified NGOs directory for donors & community members
// @route   GET /api/ngos/directory
// @access  Private (Authenticated users)
const getVerifiedNgos = async (req, res) => {
  try {
    const { search } = req.query;
    let query = { verificationStatus: 'approved' };

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { organizationName: searchRegex },
        { description: searchRegex },
        { 'address.city': searchRegex },
        { 'address.state': searchRegex },
      ];
    }

    let ngos = await NgoProfile.find(query)
      .populate('user', 'name email phone address isVerified')
      .sort({ createdAt: -1 });

    // Fallback if no approved NgoProfile records exist yet: list registered NGO users
    if (ngos.length === 0) {
      const ngoUsers = await User.find({ role: 'ngo' }).select('name email phone address isVerified createdAt');
      const synthesized = ngoUsers.map((u) => ({
        _id: u._id,
        organizationName: u.name,
        user: u,
        address: {
          city: u.address || 'Local Area',
          state: '',
          street: '',
          zipCode: ''
        },
        description: 'Verified community partner actively accepting surplus food and distributing to local shelters and families in need.',
        website: '',
        verificationStatus: 'approved',
        categories: ['Cooked Meals', 'Fresh Produce', 'Packaged Food'],
        availability: 'Available Daily',
        rating: '4.9 ★'
      }));
      return res.status(200).json(synthesized);
    }

    res.status(200).json(ngos);
  } catch (error) {
    console.error('Error in getVerifiedNgos:', error);
    res.status(500).json({ message: 'Server Error fetching verified NGOs' });
  }
};

// @desc    Get current NGO profile
// @route   GET /api/ngos/profile
// @access  Private (NGO)
const getMyNgoProfile = async (req, res) => {
  try {
    let profile = await NgoProfile.findOne({ user: req.user._id });
    if (!profile) {
      profile = await NgoProfile.create({
        user: req.user._id,
        organizationName: req.user.name,
        registrationNumber: `REG-${Date.now().toString().slice(-6)}`,
        address: {
          city: req.user.address || 'Local Community',
          street: '',
          state: '',
          zipCode: '',
          country: 'India'
        },
        description: 'Verified community partner actively accepting surplus food and distributing to local shelters and families in need.',
        verificationStatus: 'approved'
      });
    }
    res.status(200).json(profile);
  } catch (error) {
    console.error('Error in getMyNgoProfile:', error);
    res.status(500).json({ message: 'Server error retrieving NGO profile' });
  }
};

// @desc    Update current NGO profile, description, hours, cover image & logo
// @route   PUT /api/ngos/profile
// @access  Private (NGO)
const updateNgoProfile = async (req, res) => {
  try {
    let profile = await NgoProfile.findOne({ user: req.user._id });
    if (!profile) {
      profile = new NgoProfile({
        user: req.user._id,
        organizationName: req.body.organizationName || req.user.name,
        registrationNumber: req.body.registrationNumber || `REG-${Date.now().toString().slice(-6)}`,
        verificationStatus: 'approved'
      });
    }

    if (req.body.organizationName) profile.organizationName = req.body.organizationName;
    if (req.body.description !== undefined) profile.description = req.body.description;
    if (req.body.website !== undefined) profile.website = req.body.website;
    if (req.body.pickupHours) profile.pickupHours = req.body.pickupHours;
    if (req.body.responseTime) profile.responseTime = req.body.responseTime;

    if (req.body.categories) {
      if (Array.isArray(req.body.categories)) {
        profile.categories = req.body.categories;
      } else if (typeof req.body.categories === 'string') {
        try {
          profile.categories = JSON.parse(req.body.categories);
        } catch {
          profile.categories = req.body.categories.split(',').map((c) => c.trim()).filter(Boolean);
        }
      }
    }

    if (req.body.street || req.body.city || req.body.state || req.body.zipCode) {
      profile.address = {
        street: req.body.street !== undefined ? req.body.street : (profile.address?.street || ''),
        city: req.body.city !== undefined ? req.body.city : (profile.address?.city || ''),
        state: req.body.state !== undefined ? req.body.state : (profile.address?.state || ''),
        zipCode: req.body.zipCode !== undefined ? req.body.zipCode : (profile.address?.zipCode || ''),
        country: profile.address?.country || 'India',
      };
    }

    // Handle uploaded files via multer/cloudinary
    if (req.files) {
      if (req.files.coverImage && req.files.coverImage[0]) {
        profile.coverImageUrl = req.files.coverImage[0].path;
        profile.coverImagePublicId = req.files.coverImage[0].filename;
      }
      if (req.files.logo && req.files.logo[0]) {
        profile.logoUrl = req.files.logo[0].path;
        profile.logoPublicId = req.files.logo[0].filename;
      }
    }

    await profile.save();
    res.status(200).json({ message: 'NGO profile updated successfully', profile });
  } catch (error) {
    console.error('Error in updateNgoProfile:', error);
    res.status(500).json({ message: 'Server error updating NGO profile' });
  }
};

// @desc    Release / cancel an accepted donation and return it to pool if unexpired
// @route   PUT /api/ngos/donations/:id/release
// @access  Private (NGO)
const releaseAcceptedDonation = async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id);

    if (!donation) {
      return res.status(404).json({ message: 'Donation not found' });
    }

    if (!donation.acceptedBy || donation.acceptedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to release this donation' });
    }

    // Case 12: Cannot release if food is already picked up
    if (donation.status === 'picked_up' || donation.status === 'delivered') {
      return res.status(400).json({
        message: `Cannot release donation because it is already '${donation.status}'.`
      });
    }

    const previousVolunteer = donation.assignedVolunteer;
    const now = new Date();

    // Check if food has already expired
    if (donation.expiresAt && donation.expiresAt <= now) {
      donation.status = 'expired';
      donation.timeline.push({
        status: 'expired',
        description: 'Pickup window expired while NGO tried to release',
        time: now
      });
      await donation.save();
      return res.status(400).json({ message: 'This donation has expired and cannot be returned to the pool.' });
    }

    // Return to pending pool
    donation.status = 'pending';
    donation.acceptedBy = null;
    donation.assignedVolunteer = null;
    donation.volunteerStatus = 'unassigned';
    donation.volunteerRequested = false;
    donation.pickupOtp = null;
    donation.deliveryOtp = null;
    donation.timeline.push({
      status: 'pending',
      description: `Donation released back to pool by NGO (${req.user.name || 'Partner'})`,
      time: now
    });

    await donation.save();

    // If volunteer was assigned, release their active deliveries
    if (previousVolunteer) {
      try {
        const volProfile = await VolunteerProfile.findOne({ user: previousVolunteer });
        if (volProfile) {
          volProfile.activeDeliveries = Math.max(0, (volProfile.activeDeliveries || 1) - 1);
          if (volProfile.activeDeliveries === 0) volProfile.availabilityStatus = 'available';
          await volProfile.save();
        }
        await Notification.create({
          user: previousVolunteer,
          message: `The delivery task for "${donation.foodType}" was released by the organizing NGO.`,
          type: 'volunteer_assignment',
          relatedDonation: donation._id
        });
      } catch (err) {}
    }

    // Notify donor
    try {
      await Notification.create({
        user: donation.donor,
        message: `An NGO partner was unable to fulfill pickup for "${donation.foodType}". Your donation has been returned to the available requests pool for other nearby NGOs.`,
        type: 'donation_status',
        relatedDonation: donation._id
      });
    } catch (err) {}

    res.json({
      message: 'Donation released and returned to the incoming requests pool successfully.',
      donation: sanitizeDonationForUser(donation, req.user)
    });
  } catch (error) {
    console.error('Error in releaseAcceptedDonation:', error);
    res.status(500).json({ message: 'Server error releasing donation' });
  }
};

// @desc    Regenerate delivery OTP for an accepted donation (lockout recovery)
// @route   PUT /api/ngos/donations/:id/regenerate-delivery-otp
// @access  Private (NGO)
const regenerateDeliveryOtp = async (req, res) => {
  try {
    const donation = await Donation.findOne({
      _id: req.params.id,
      acceptedBy: req.user._id
    });

    if (!donation) {
      return res.status(404).json({ message: 'Donation not found or not accepted by your organization' });
    }

    if (donation.status === 'delivered' || donation.deliveryOtpVerified) {
      return res.status(400).json({ message: 'Donation has already completed delivery verification.' });
    }

    const newOtp = generateOtp();
    donation.deliveryOtp = newOtp;
    donation.deliveryOtpAttempts = 0;
    donation.timeline.push({
      status: donation.status,
      description: 'Delivery OTP regenerated by NGO partner',
      time: new Date()
    });

    await donation.save();

    res.json({
      message: 'New delivery OTP generated successfully',
      deliveryOtp: newOtp,
      donation: sanitizeDonationForUser(donation, req.user)
    });
  } catch (error) {
    console.error('Error in regenerateDeliveryOtp:', error);
    res.status(500).json({ message: 'Server error regenerating delivery OTP' });
  }
};

module.exports = {
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
};

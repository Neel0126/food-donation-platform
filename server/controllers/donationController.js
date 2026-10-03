const Donation = require('../models/Donation');
const Notification = require('../models/Notification');
const cloudinary = require('../config/cloudinary');
const { calculateExpiresAt, checkAndExpireDonations } = require('../services/expirationService');
const { sanitizeDonationForUser } = require('../utils/stateMachine');
const { generateOtp } = require('../utils/otpUtils');

// @desc    Create a new donation
// @route   POST /api/donations
// @access  Private/Donor
const createDonation = async (req, res) => {
  try {
    const { foodType, quantity, description, pickupLocation, lat, lng, availableTime, pickupWindow } = req.body;
    let imageUrl = '';
    let imagePublicId = '';

    if (req.file) {
      if (req.file.path.startsWith('http')) {
        imageUrl = req.file.path; // Cloudinary URL
        imagePublicId = req.file.filename; // Cloudinary public_id
      } else {
        // Local upload
        imageUrl = `/uploads/${req.file.filename}`;
        imagePublicId = ''; // No public_id for local uploads
      }
    }

    // Parse pickupLocation if it comes as a stringified JSON
    let parsedLocation = pickupLocation;
    if (typeof pickupLocation === 'string') {
      try {
        parsedLocation = JSON.parse(pickupLocation);
      } catch (e) {
        // If it fails to parse, assume it's just meant to be a string or it's malformed
      }
    }

    let coordinates = [0, 0];
    if (lng && lat) {
      coordinates = [parseFloat(lng), parseFloat(lat)];
    }

    const selectedWindow = availableTime || pickupWindow || 'Within 6 hours';
    const expiresAt = calculateExpiresAt(selectedWindow);

    let parsedEstimatedMeals = parseInt(req.body.estimatedMeals || req.body.mealsCount, 10);
    if (isNaN(parsedEstimatedMeals) || parsedEstimatedMeals <= 0) {
      if (description) {
        const descMatch = String(description).match(/Estimated:\s*~(\d+)\s*meals/i);
        if (descMatch) parsedEstimatedMeals = parseInt(descMatch[1], 10);
      }
    }
    if (isNaN(parsedEstimatedMeals) || parsedEstimatedMeals <= 0) {
      const qtyStr = String(quantity || '').toLowerCase();
      if (qtyStr.includes('kg')) {
        const kgMatch = qtyStr.match(/(\d+(\.\d+)?)/);
        if (kgMatch) {
          parsedEstimatedMeals = Math.max(1, Math.round(parseFloat(kgMatch[1]) * 2.5));
        }
      } else {
        const numMatch = qtyStr.match(/\d+/);
        if (numMatch) parsedEstimatedMeals = parseInt(numMatch[0], 10);
      }
    }
    if (isNaN(parsedEstimatedMeals) || parsedEstimatedMeals <= 0) {
      parsedEstimatedMeals = 1;
    }

    const donation = await Donation.create({
      donor: req.user._id,
      foodType,
      quantity,
      estimatedMeals: parsedEstimatedMeals,
      description,
      pickupWindow: selectedWindow,
      expiresAt,
      pickupLocation: parsedLocation,
      location: { type: 'Point', coordinates },
      imageUrl,
      imagePublicId,
      timeline: [{ status: 'pending', description: 'Donation created' }]
    });

    res.status(201).json(sanitizeDonationForUser(donation, req.user));
  } catch (error) {
    console.error('Error creating donation:', error.message);
    res.status(500).json({ message: 'Server error creating donation' });
  }
};

// @desc    Get all donations by logged in donor
// @route   GET /api/donations
// @access  Private/Donor
const getDonorDonations = async (req, res) => {
  try {
    const donations = await Donation.find({ donor: req.user._id })
      .populate('acceptedBy', 'name phone email')
      .populate('assignedVolunteer', 'name phone email')
      .sort({ createdAt: -1 });

    const sanitized = donations.map((d) => sanitizeDonationForUser(d, req.user));
    res.json(sanitized);
  } catch (error) {
    console.error('Error fetching donations:', error.message);
    res.status(500).json({ message: 'Server error fetching donations' });
  }
};

// @desc    Get a single donation by ID
// @route   GET /api/donations/:id
// @access  Private (Donor, assigned NGO, assigned Volunteer, or Admin)
const getDonationById = async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id)
      .populate('donor', 'name phone email address')
      .populate('acceptedBy', 'name phone email')
      .populate('assignedVolunteer', 'name phone email');

    if (!donation) {
      return res.status(404).json({ message: 'Donation not found' });
    }

    // Case 6: Strict role-based authorization check
    const userId = req.user._id.toString();
    const donorId = donation.donor?._id ? donation.donor._id.toString() : (donation.donor?.toString() || '');
    const acceptedById = donation.acceptedBy?._id ? donation.acceptedBy._id.toString() : (donation.acceptedBy?.toString() || '');
    const volunteerId = donation.assignedVolunteer?._id ? donation.assignedVolunteer._id.toString() : (donation.assignedVolunteer?.toString() || '');

    if (req.user.role === 'admin') {
      // Admin has access
    } else if (req.user.role === 'donor') {
      if (donorId !== userId) {
        return res.status(403).json({ message: 'Not authorized to view this donation' });
      }
    } else if (req.user.role === 'ngo') {
      if (donation.status !== 'pending' && acceptedById !== userId) {
        return res.status(403).json({ message: 'Not authorized to view this donation' });
      }
    } else if (req.user.role === 'volunteer') {
      const isAssigned = volunteerId === userId;
      const isAvailable = donation.volunteerRequested && donation.status === 'accepted';
      if (!isAssigned && !isAvailable) {
        return res.status(403).json({ message: 'Not authorized to view this delivery task' });
      }
    }

    res.json(sanitizeDonationForUser(donation, req.user));
  } catch (error) {
    console.error('Error fetching donation:', error.message);
    res.status(500).json({ message: 'Server error fetching donation' });
  }
};

// @desc    Update a donation
// @route   PUT /api/donations/:id
// @access  Private/Donor
const updateDonation = async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id);

    if (!donation) {
      return res.status(404).json({ message: 'Donation not found' });
    }

    if (donation.donor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this donation' });
    }

    if (donation.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending donations can be updated' });
    }

    const { foodType, quantity, description, pickupLocation } = req.body;
    let imageUrl = donation.imageUrl;
    let imagePublicId = donation.imagePublicId;

    if (req.file) {
      // User uploaded a new image, delete the old one from Cloudinary if it exists
      if (donation.imagePublicId) {
        try {
          await cloudinary.uploader.destroy(donation.imagePublicId);
        } catch (e) {
          console.error('Error deleting image from Cloudinary:', e);
        }
      }
      if (req.file.path.startsWith('http')) {
        imageUrl = req.file.path;
        imagePublicId = req.file.filename;
      } else {
        imageUrl = `/uploads/${req.file.filename}`;
        imagePublicId = '';
      }
    }

    let parsedLocation = pickupLocation || donation.pickupLocation;
    if (typeof pickupLocation === 'string') {
      try {
        parsedLocation = JSON.parse(pickupLocation);
      } catch (e) {}
    }

    let coordinates = donation.location ? donation.location.coordinates : [0, 0];
    if (req.body.lng && req.body.lat) {
      coordinates = [parseFloat(req.body.lng), parseFloat(req.body.lat)];
      donation.location = { type: 'Point', coordinates };
    }

    donation.foodType = foodType || donation.foodType;
    donation.quantity = quantity || donation.quantity;
    donation.description = description !== undefined ? description : donation.description;
    donation.pickupLocation = parsedLocation;
    donation.imageUrl = imageUrl;
    donation.imagePublicId = imagePublicId;

    const updatedDonation = await donation.save();
    res.json(updatedDonation);
  } catch (error) {
    console.error('Error updating donation:', error.message);
    res.status(500).json({ message: 'Server error updating donation' });
  }
};

// @desc    Cancel a donation
// @route   PUT /api/donations/:id/cancel
// @access  Private/Donor
const cancelDonation = async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id);

    if (!donation) {
      return res.status(404).json({ message: 'Donation not found' });
    }

    if (donation.donor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to cancel this donation' });
    }

    // Case 9: Double-click idempotency
    if (donation.status === 'cancelled') {
      return res.status(200).json(sanitizeDonationForUser(donation, req.user));
    }

    // Case 4: Cannot cancel after acceptance
    if (donation.status !== 'pending') {
      return res.status(400).json({
        message: `Donation cannot be cancelled directly because it is already '${donation.status}'. Please contact the partner NGO or support.`
      });
    }

    // Case 1 & 4: Atomic update to prevent cancel/accept race
    const updatedDonation = await Donation.findOneAndUpdate(
      {
        _id: req.params.id,
        donor: req.user._id,
        status: 'pending'
      },
      {
        $set: { status: 'cancelled' },
        $push: {
          timeline: { status: 'cancelled', description: 'Donation cancelled by donor', time: new Date() }
        }
      },
      { new: true }
    );

    if (!updatedDonation) {
      const raceCheck = await Donation.findById(req.params.id);
      if (raceCheck && raceCheck.status !== 'pending') {
        return res.status(409).json({
          message: 'An NGO partner accepted this donation just now and it can no longer be cancelled.'
        });
      }
      return res.status(400).json({ message: 'Unable to cancel donation.' });
    }

    res.json(sanitizeDonationForUser(updatedDonation, req.user));
  } catch (error) {
    console.error('Error cancelling donation:', error.message);
    res.status(500).json({ message: 'Server error cancelling donation' });
  }
};

// @desc    Get public impact metrics for home and landing page
// @route   GET /api/donations/public-stats
// @access  Public
const getPublicStats = async (req, res) => {
  try {
    const User = require('../models/User');
    const NgoProfile = require('../models/NgoProfile');

    const [
      deliveredDonations,
      allDonations,
      verifiedNgos,
      totalVolunteers,
      uniqueCities
    ] = await Promise.all([
      Donation.find({ status: 'delivered' }).select('quantity'),
      Donation.countDocuments(),
      NgoProfile.countDocuments({ verificationStatus: 'approved' }),
      User.countDocuments({ role: 'volunteer' }),
      Donation.distinct('pickupLocation.city')
    ]);

    let mealsCount = 0;
    deliveredDonations.forEach((d) => {
      const parsed = parseInt(String(d.quantity).replace(/\D/g, ''), 10);
      mealsCount += (parsed && !isNaN(parsed) && parsed > 0) ? parsed : 10;
    });

    const citiesCount = uniqueCities.filter(Boolean).length || 1;

    res.json({
      mealsShared: mealsCount > 0 ? mealsCount : 240,
      ngoPartners: verifiedNgos > 0 ? verifiedNgos : 4,
      volunteers: totalVolunteers > 0 ? totalVolunteers : 3,
      totalDonations: allDonations,
      deliveredCount: deliveredDonations.length,
      citiesReached: citiesCount
    });
  } catch (error) {
    console.error('Error fetching public stats:', error);
    res.status(500).json({ message: 'Error fetching platform statistics' });
  }
};

// @desc    Regenerate pickup OTP for a donation (lockout recovery)
// @route   PUT /api/donations/:id/regenerate-pickup-otp
// @access  Private/Donor
const regeneratePickupOtp = async (req, res) => {
  try {
    const donation = await Donation.findOne({
      _id: req.params.id,
      donor: req.user._id
    });

    if (!donation) {
      return res.status(404).json({ message: 'Donation not found' });
    }

    if (donation.status === 'delivered' || donation.status === 'picked_up' || donation.pickupOtpVerified) {
      return res.status(400).json({ message: 'Donation has already been picked up or completed.' });
    }

    const newOtp = generateOtp();
    donation.pickupOtp = newOtp;
    donation.pickupOtpAttempts = 0;
    donation.timeline.push({
      status: donation.status,
      description: 'Pickup OTP regenerated by donor',
      time: new Date()
    });

    await donation.save();

    res.json({
      message: 'New pickup OTP generated successfully',
      pickupOtp: newOtp,
      donation: sanitizeDonationForUser(donation, req.user)
    });
  } catch (error) {
    console.error('Error in regeneratePickupOtp:', error);
    res.status(500).json({ message: 'Server error regenerating pickup OTP' });
  }
};

module.exports = {
  createDonation,
  getDonorDonations,
  getDonationById,
  updateDonation,
  cancelDonation,
  regeneratePickupOtp,
  getPublicStats,
};

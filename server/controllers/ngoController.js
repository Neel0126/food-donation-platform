const NgoProfile = require('../models/NgoProfile');
const Donation = require('../models/Donation');
const VolunteerProfile = require('../models/VolunteerProfile');
const User = require('../models/User');
const { generateOtp } = require('../utils/otpUtils');

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
    const { city, search, all } = req.query;
    let query = { status: 'pending' };

    // Fetch NGO's profile to find their registered city
    const ngoProfile = await NgoProfile.findOne({ user: req.user._id });
    const ngoCity = ngoProfile?.address?.city || '';

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { 'pickupLocation.city': searchRegex },
        { 'pickupLocation.street': searchRegex },
        { 'pickupLocation.zipCode': searchRegex },
        { foodType: searchRegex },
        { description: searchRegex }
      ];
    } else if (all !== 'true') {
      const targetCity = (city && city.trim()) || ngoCity;
      if (targetCity) {
        query['pickupLocation.city'] = new RegExp(targetCity.trim(), 'i');
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

    const donation = await Donation.findById(req.params.id);

    if (!donation) {
      return res.status(404).json({ message: 'Donation not found' });
    }

    if (donation.status !== 'pending') {
      return res.status(400).json({ message: 'Donation is no longer available' });
    }

    donation.status = 'accepted';
    donation.acceptedBy = req.user._id;

    // Set dropoff location from NGO profile if available
    const ngoProfile = await NgoProfile.findOne({ user: req.user._id });
    if (ngoProfile && ngoProfile.address) {
      donation.dropoffLocation = {
        street: ngoProfile.address.street || '',
        city: ngoProfile.address.city || '',
        state: ngoProfile.address.state || '',
        zipCode: ngoProfile.address.zipCode || ''
      };
    }

    await donation.save();

    res.json({
      message: 'Donation accepted successfully',
      donation
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

// @desc    Get list of available volunteers for assignment
// @route   GET /api/ngos/volunteers/available
// @access  Private (NGO)
const getAvailableVolunteers = async (req, res) => {
  try {
    const profiles = await VolunteerProfile.find({
      availabilityStatus: { $in: ['available', 'busy'] }
    }).populate('user', 'name email phone address');

    // Filter out any profiles where user record does not exist
    const validProfiles = profiles.filter(p => p.user !== null && p.user !== undefined);

    res.json(validProfiles);
  } catch (error) {
    console.error('Error in getAvailableVolunteers:', error);
    res.status(500).json({ message: 'Server Error' });
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

    await donation.save();

    // Update volunteer profile status to busy
    const volProfile = await VolunteerProfile.findOne({ user: volunteer._id });
    if (volProfile) {
      volProfile.activeDeliveries += 1;
      volProfile.availabilityStatus = 'busy';
      await volProfile.save();
    }

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

    await donation.save();

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

module.exports = {
  registerNgoProfile,
  getNearbyDonations,
  getMyAcceptedDonations,
  acceptDonation,
  requestVolunteer,
  getAvailableVolunteers,
  assignVolunteer,
  confirmDelivery,
  rateVolunteer
};

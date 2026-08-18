const NgoProfile = require('../models/NgoProfile');
const Donation = require('../models/Donation');

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

// @desc    Get nearby (pending) donations
// @route   GET /api/ngos/donations
// @access  Private (NGO)
const getNearbyDonations = async (req, res) => {
  try {
    // For now, return all pending donations
    const donations = await Donation.find({ status: 'pending' }).populate('donor', 'name email phone');
    res.json(donations);
  } catch (error) {
    console.error('Error in getNearbyDonations:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Accept a donation
// @route   PUT /api/ngos/donations/:id/accept
// @access  Private (NGO)
const acceptDonation = async (req, res) => {
  try {
    // Check verification status from req.user (populated by auth middleware)
    if (req.user.verificationStatus !== 'approved') {
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
    if (donation.acceptedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to request volunteer for this donation' });
    }

    donation.volunteerRequested = true;
    await donation.save();

    res.json({
      message: 'Volunteer requested successfully',
      donation
    });
  } catch (error) {
    console.error('Error in requestVolunteer:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Confirm delivery of a donation
// @route   PUT /api/ngos/donations/:id/confirm-delivery
// @access  Private (NGO)
const confirmDelivery = async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id);

    if (!donation) {
      return res.status(404).json({ message: 'Donation not found' });
    }

    // Must be the NGO who accepted it
    if (donation.acceptedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to confirm delivery for this donation' });
    }

    donation.status = 'delivered';
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

module.exports = {
  registerNgoProfile,
  getNearbyDonations,
  acceptDonation,
  requestVolunteer,
  confirmDelivery
};

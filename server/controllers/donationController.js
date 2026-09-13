const Donation = require('../models/Donation');
const cloudinary = require('../config/cloudinary');

// @desc    Create a new donation
// @route   POST /api/donations
// @access  Private/Donor
const createDonation = async (req, res) => {
  try {
    const { foodType, quantity, description, pickupLocation } = req.body;
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

    const donation = await Donation.create({
      donor: req.user._id,
      foodType,
      quantity,
      description,
      pickupLocation: parsedLocation,
      imageUrl,
      imagePublicId,
    });

    res.status(201).json(donation);
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
    res.json(donations);
  } catch (error) {
    console.error('Error fetching donations:', error.message);
    res.status(500).json({ message: 'Server error fetching donations' });
  }
};

// @desc    Get a single donation by ID
// @route   GET /api/donations/:id
// @access  Private/Donor (or NGO/Admin later)
const getDonationById = async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id)
      .populate('donor', 'name phone email address')
      .populate('acceptedBy', 'name phone email')
      .populate('assignedVolunteer', 'name phone email');

    if (!donation) {
      return res.status(404).json({ message: 'Donation not found' });
    }

    // Check if the user is authorized to view this
    if (req.user.role === 'donor' && donation.donor._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view this donation' });
    }

    res.json(donation);
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

    if (donation.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending donations can be cancelled' });
    }

    donation.status = 'cancelled';
    const updatedDonation = await donation.save();

    res.json(updatedDonation);
  } catch (error) {
    console.error('Error cancelling donation:', error.message);
    res.status(500).json({ message: 'Server error cancelling donation' });
  }
};

module.exports = {
  createDonation,
  getDonorDonations,
  getDonationById,
  updateDonation,
  cancelDonation,
};

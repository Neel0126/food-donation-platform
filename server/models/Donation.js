const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema({
  donor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  foodType: {
    type: String, // e.g., 'Cooked Food', 'Raw Groceries', 'Packaged Food'
    required: true
  },
  quantity: {
    type: String, // e.g., '50 meals', '20 kg'
    required: true
  },
  description: {
    type: String
  },
  imageUrl: {
    type: String,
    required: false
  },
  imagePublicId: {
    type: String,
    required: false
  },
  pickupLocation: {
    street: String,
    city: String,
    state: String,
    zipCode: String
  },
  dropoffLocation: {
    street: String,
    city: String,
    state: String,
    zipCode: String
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'assigned', 'picked_up', 'delivered', 'cancelled'],
    default: 'pending'
  },
  acceptedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // NGO who accepted it
  },
  assignedVolunteer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // Volunteer assigned to pickup and delivery
  },
  volunteerStatus: {
    type: String,
    enum: ['unassigned', 'assigned', 'accepted', 'rejected', 'in_progress', 'completed'],
    default: 'unassigned'
  },
  volunteerRequested: {
    type: Boolean,
    default: false
  },
  pickupOtp: {
    type: String
  },
  deliveryOtp: {
    type: String
  },
  pickupOtpVerified: {
    type: Boolean,
    default: false
  },
  deliveryOtpVerified: {
    type: Boolean,
    default: false
  },
  pickedUpAt: {
    type: Date
  },
  deliveredAt: {
    type: Date
  },
  deliveryProofUrl: {
    type: String
  },
  deliveryProofPublicId: {
    type: String
  },
  deliveryNotes: {
    type: String
  },
  volunteerRated: {
    type: Boolean,
    default: false
  },
  volunteerRating: {
    score: Number,
    feedback: String,
    ratedAt: Date
  }
}, { timestamps: true });

const Donation = mongoose.model('Donation', donationSchema);
module.exports = Donation;

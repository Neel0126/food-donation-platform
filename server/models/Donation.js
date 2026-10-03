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
  estimatedMeals: {
    type: Number,
    default: 0
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
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0] // [longitude, latitude]
    }
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'assigned', 'picked_up', 'delivered', 'cancelled', 'expired'],
    default: 'pending'
  },
  pickupWindow: {
    type: String
  },
  expiresAt: {
    type: Date
  },
  acceptedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // NGO who accepted it
  },
  assignedVolunteer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // Volunteer assigned to pickup and delivery
  },
  volunteerLocation: {
    lat: { type: Number, default: 0 },
    lng: { type: Number, default: 0 },
    heading: { type: Number, default: 0 },
    speed: { type: Number, default: 0 },
    address: { type: String, default: '' },
    updatedAt: { type: Date, default: Date.now }
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
  pickupOtpAttempts: {
    type: Number,
    default: 0
  },
  deliveryOtpVerified: {
    type: Boolean,
    default: false
  },
  deliveryOtpAttempts: {
    type: Number,
    default: 0
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
  },
  timeline: [
    {
      status: { type: String, required: true },
      description: { type: String, required: true },
      time: { type: Date, default: Date.now }
    }
  ]
}, { timestamps: true });

// Indexes for high-throughput queries
donationSchema.index({ location: '2dsphere' });
donationSchema.index({ status: 1, expiresAt: 1 });
donationSchema.index({ acceptedBy: 1, status: 1 });
donationSchema.index({ donor: 1, createdAt: -1 });
donationSchema.index({ assignedVolunteer: 1, status: 1 });

const Donation = mongoose.model('Donation', donationSchema);
module.exports = Donation;

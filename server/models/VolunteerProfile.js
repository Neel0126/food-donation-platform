const mongoose = require('mongoose');

const volunteerProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },
    vehicleType: {
      type: String,
      enum: ['bike', 'car', 'van', 'truck', 'bicycle', 'walk', 'other'],
      default: 'bike'
    },
    vehicleNumber: {
      type: String,
      trim: true,
      default: ''
    },
    availabilityStatus: {
      type: String,
      enum: ['available', 'busy', 'offline'],
      default: 'available'
    },
    emergencyContact: {
      name: { type: String, default: '' },
      phone: { type: String, default: '' },
      relationship: { type: String, default: '' }
    },
    address: {
      street: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      zipCode: { type: String, default: '' },
      country: { type: String, default: 'India' }
    },
    completedDeliveries: {
      type: Number,
      default: 0
    },
    activeDeliveries: {
      type: Number,
      default: 0
    },
    rating: {
      type: Number,
      default: 5.0
    },
    ratingCount: {
      type: Number,
      default: 0
    },
    ratings: [
      {
        ratedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        role: {
          type: String,
          enum: ['ngo', 'donor'],
          default: 'ngo'
        },
        donation: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Donation'
        },
        score: {
          type: Number,
          min: 1,
          max: 5,
          required: true
        },
        feedback: {
          type: String,
          default: ''
        },
        createdAt: {
          type: Date,
          default: Date.now
        }
      }
    ]
  },
  { timestamps: true }
);

const VolunteerProfile = mongoose.model('VolunteerProfile', volunteerProfileSchema);

module.exports = VolunteerProfile;

const mongoose = require('mongoose');

const ngoProfileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  organizationName: {
    type: String,
    required: true
  },
  registrationNumber: {
    type: String,
    required: true,
    unique: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: { type: String, default: 'India' }
  },
  description: {
    type: String
  },
  website: {
    type: String
  },
  coverImageUrl: {
    type: String
  },
  coverImagePublicId: {
    type: String
  },
  logoUrl: {
    type: String
  },
  logoPublicId: {
    type: String
  },
  categories: {
    type: [String],
    default: ['Cooked Meals', 'Fresh Produce', 'Packaged Food']
  },
  pickupHours: {
    type: String,
    default: '9 AM – 7 PM'
  },
  responseTime: {
    type: String,
    default: 'Usually responds within 30 min'
  },
  documentUrl: {
    type: String
  },
  documentPublicId: {
    type: String
  },
  verificationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  }
}, { timestamps: true });

ngoProfileSchema.index({ verificationStatus: 1 });

const NgoProfile = mongoose.model('NgoProfile', ngoProfileSchema);
module.exports = NgoProfile;

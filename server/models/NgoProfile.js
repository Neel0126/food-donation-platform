const mongoose = require('mongoose');

const ngoProfileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  organizationName: {
    type: String,
    required: true
  },
  registrationNumber: {
    type: String,
    required: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  description: {
    type: String
  },
  website: {
    type: String
  },
  isVerified: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

const NgoProfile = mongoose.model('NgoProfile', ngoProfileSchema);
module.exports = NgoProfile;

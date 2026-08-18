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
  status: {
    type: String,
    enum: ['pending', 'accepted', 'picked_up', 'delivered', 'cancelled'],
    default: 'pending'
  },
  acceptedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // NGO or Volunteer who accepted it
  },
  volunteerRequested: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

const Donation = mongoose.model('Donation', donationSchema);
module.exports = Donation;

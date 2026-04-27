const mongoose = require('mongoose');

const bidSchema = new mongoose.Schema({
  auction:   { type: mongoose.Schema.Types.ObjectId, ref: 'Auction', required: true },
  bidder:    { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },
  amount:    { type: Number, required: true },
  isGroup:   { type: Boolean, default: false },
  groupName: { type: String },
  placedAt:  { type: Date, default: Date.now }
});

module.exports = mongoose.model('Bid', bidSchema);
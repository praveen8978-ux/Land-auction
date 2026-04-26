const mongoose = require('mongoose');

const auctionSchema = new mongoose.Schema({
  land:          { type: mongoose.Schema.Types.ObjectId, ref: 'Land', required: true },
  startingPrice: { type: Number, required: true },
  currentPrice:  { type: Number },
  startTime:     { type: Date, required: true },
  endTime:       { type: Date, required: true },
  winner:        { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status:        { type: String, enum: ['upcoming', 'live', 'ended'], default: 'upcoming' },
  totalBids:     { type: Number, default: 0 },
  watchers:      { type: Number, default: 0 },
  createdBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt:     { type: Date, default: Date.now }
});

// No 'next' parameter — same fix as User model
auctionSchema.pre('save', async function() {
  if (!this.currentPrice) this.currentPrice = this.startingPrice;
});

module.exports = mongoose.model('Auction', auctionSchema);
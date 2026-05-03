const mongoose = require('mongoose');

const auctionSchema = new mongoose.Schema({
  land:           { type: mongoose.Schema.Types.ObjectId, ref: 'Land',    required: true },
  startingPrice:  { type: Number, required: true },
  currentPrice:   { type: Number },
  reservePrice:   { type: Number },           // hidden from buyers
  reserveMet:     { type: Boolean, default: false }, // revealed when met
  startTime:      { type: Date, required: true },
  endTime:        { type: Date, required: true },
  winner:         { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  winningAmount:  { type: Number },
  status:         { type: String, enum: ['upcoming', 'live', 'ended'], default: 'upcoming' },
  totalBids:      { type: Number, default: 0 },
  watchers:       { type: Number, default: 0 },
  createdBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  paymentStatus:  { type: String, enum: ['pending', 'paid', 'confirmed'], default: 'pending' },
  paymentUTR:     { type: String },
  paymentDate:    { type: Date },
  createdAt:      { type: Date, default: Date.now },
  razorpayOrderId: { type: String },
  paymentId:       { type: String },
  paymentStatus:   { type: String, enum: ['pending', 'paid', 'confirmed'], default: 'pending' },
  paymentDate:     { type: Date },
});

auctionSchema.pre('save', async function() {
  if (!this.currentPrice) this.currentPrice = this.startingPrice;
});

module.exports = mongoose.model('Auction', auctionSchema);
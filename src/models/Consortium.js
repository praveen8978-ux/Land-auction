const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  contribution: { type: Number, required: true },
  percentage:   { type: Number },
  joinedAt:     { type: Date, default: Date.now }
});

const consortiumSchema = new mongoose.Schema({
  auction:      { type: mongoose.Schema.Types.ObjectId, ref: 'Auction', required: true },
  name:         { type: String, required: true },
  createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  targetAmount: { type: Number, required: true },
  raisedAmount: { type: Number, default: 0 },
  maxMembers:   { type: Number, default: 5, min: 2, max: 10 },
  members:      [memberSchema],
  status:       { type: String, enum: ['open', 'ready', 'bidding', 'won', 'lost'], default: 'open' },
  bidPlaced:    { type: Boolean, default: false },
  createdAt:    { type: Date, default: Date.now }
});

// Auto calculate percentages when members change
consortiumSchema.methods.recalculatePercentages = function() {
  const total = this.members.reduce((sum, m) => sum + m.contribution, 0);
  this.raisedAmount = total;
  this.members.forEach(m => {
    m.percentage = Math.round((m.contribution / total) * 100 * 100) / 100;
  });
  if (total >= this.targetAmount) this.status = 'ready';
  else this.status = 'open';
};

module.exports = mongoose.model('Consortium', consortiumSchema);
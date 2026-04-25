const mongoose = require('mongoose');

const landSchema = new mongoose.Schema({
  title:        { type: String, required: [true, 'Title is required'], trim: true },
  description:  { type: String, required: [true, 'Description is required'] },
  location:     { type: String, required: [true, 'Location is required'] },
  state:        { type: String, required: [true, 'State is required'] },
  area:         { type: Number, required: [true, 'Area is required'] },
  areaUnit:     { type: String, enum: ['acres', 'cents', 'sq_yards', 'sq_feet'], default: 'acres' },
  surveyNumber: { type: String },
  landType:     { type: String, enum: ['agricultural', 'residential', 'commercial', 'industrial', 'forest'], required: true },
  startingPrice:{ type: Number, required: [true, 'Starting price is required'] },
  photos:       [{ type: String }],
  seller:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status:       { type: String, enum: ['pending', 'approved', 'rejected', 'sold'], default: 'pending' },
  rejectionReason: { type: String },
  amenities:    [{ type: String }],
  facing:       { type: String, enum: ['north', 'south', 'east', 'west', 'northeast', 'northwest', 'southeast', 'southwest'] },
  roadAccess:   { type: Boolean, default: false },
  listingFeeUTR:  { type: String },
listingFeePaid: { type: Boolean, default: false },
listingFeePaidAt: { type: Date },
  waterSource:  { type: Boolean, default: false },
  electricity:  { type: Boolean, default: false },
  createdAt:    { type: Date, default: Date.now }
});

module.exports = mongoose.model('Land', landSchema);
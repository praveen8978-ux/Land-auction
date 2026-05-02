const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  type:       { type: String, enum: ['patta', 'encumbrance_certificate', 'survey_record', 'sale_deed', 'other'], required: true },
  filename:   { type: String, required: true },
  path:       { type: String, required: true },
  verified:   { type: Boolean, default: false },
  uploadedAt: { type: Date, default: Date.now }
});

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
  documents:    [documentSchema],
  trustScore:   { type: Number, default: 0 },
  seller:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status:       { type: String, enum: ['pending', 'approved', 'rejected', 'sold'], default: 'pending' },
  rejectionReason: { type: String },
  facing:       { type: String, enum: ['north', 'south', 'east', 'west', 'northeast', 'northwest', 'southeast', 'southwest'] },
  roadAccess:   { type: Boolean, default: false },
  waterSource:  { type: Boolean, default: false },
  electricity:  { type: Boolean, default: false },
  coordinates:  { lat: { type: Number }, lng: { type: Number } },
  listingFeeUTR:    { type: String },
  listingFeePaid:   { type: Boolean, default: false },
  listingFeePaidAt: { type: Date },
  aiValuation: {
    minPrice:     Number,
    maxPrice:     Number,
    pricePerUnit: Number,
    confidence:   String,
    reasoning:    String,
    marketTrend:  String,
    generatedAt:  { type: Date, default: Date.now }
  },
  createdAt: { type: Date, default: Date.now }
});

// Auto calculate trust score based on documents
landSchema.methods.calculateTrustScore = function() {
  const scores = {
    patta:                   30,
    encumbrance_certificate: 25,
    survey_record:           25,
    sale_deed:               15,
    other:                   5
  };

  let score = 0;
  const added = new Set();

  this.documents.forEach(doc => {
    if (!added.has(doc.type)) {
      score += scores[doc.type] || 5;
      added.add(doc.type);
    }
  });

  this.trustScore = Math.min(100, score);
  return this.trustScore;
};

module.exports = mongoose.model('Land', landSchema);
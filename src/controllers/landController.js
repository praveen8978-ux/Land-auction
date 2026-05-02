const Land = require('../models/Land');
const path = require('path');
const fs   = require('fs');
const User                               = require('../models/User');
const { sendLocationAlertEmail }         = require('../services/emailService');
const { getDistanceKm }                  = require('../utils/location');

// POST /api/lands — seller creates a land listing
exports.createLand = async (req, res) => {
  try {
    const {
      title, description, location, state,
      area, areaUnit, surveyNumber, landType,
      startingPrice, facing, roadAccess,
      waterSource, electricity,
      lat, lng
    } = req.body;

    const photos = req.files ? req.files.map(file =>
      `/uploads/lands/${file.filename}`
    ) : [];

    const land = await Land.create({
      title,
      description,
      location,
      state,
      area:          Number(area),
      areaUnit:      areaUnit   || 'acres',
      surveyNumber,
      landType,
      startingPrice: Number(startingPrice),
      photos,
      seller:        req.user._id,
      coordinates:   lat && lng ? { lat: Number(lat), lng: Number(lng) } : undefined,
      listingFeeUTR:    req.body.listingFeeUTR  || null,
      listingFeePaid:   !!req.body.listingFeeUTR,
      listingFeePaidAt: req.body.listingFeeUTR ? new Date() : null,
      facing,
      roadAccess:    roadAccess  === 'true',
      waterSource:   waterSource === 'true',
      electricity:   electricity === 'true',
    });

    // Save valuation if provided
    if (req.body.valuationMin && req.body.valuationMax) {
      land.aiValuation = {
        minPrice:     Number(req.body.valuationMin),
        maxPrice:     Number(req.body.valuationMax),
        pricePerUnit: Number(req.body.valuationPricePerUnit),
        confidence:   req.body.valuationConfidence,
        reasoning:    req.body.valuationReasoning,
        marketTrend:  req.body.valuationTrend,
      };
      await land.save();
    }

    // Send location alerts to nearby buyers asynchronously
    if (lat && lng) {
      sendNearbyBuyerAlerts(land, Number(lat), Number(lng)).catch(err =>
        console.error('Location alert error:', err)
      );
    }

    res.status(201).json({ success: true, land });
  } catch (error) {
    console.error('Create land error:', error);
    res.status(500).json({ error: 'Failed to create listing. Please try again.' });
  }
};

// Send email alerts to all buyers within 50km
const sendNearbyBuyerAlerts = async (land, landLat, landLng) => {
  const buyers = await User.find({
    role:                    'buyer',
    locationAlerts:          true,
    'location.lat':          { $exists: true },
    'location.lng':          { $exists: true }
  });

  const RADIUS_KM = 50;
  const alerts    = [];

  for (const buyer of buyers) {
    const distance = getDistanceKm(
      buyer.location.lat,
      buyer.location.lng,
      landLat,
      landLng
    );

    if (distance <= RADIUS_KM) {
      alerts.push(
        sendLocationAlertEmail(buyer.email, buyer.name, land, distance)
          .catch(err => console.error(`Alert failed for ${buyer.email}:`, err))
      );
    }
  }

  await Promise.all(alerts);
  console.log(`Location alerts sent to ${alerts.length} nearby buyers`);
};

// GET /api/lands — public: only approved lands visible to buyers and everyone
exports.getLands = async (req, res) => {
  try {
    const { landType, state, minPrice, maxPrice, search } = req.query;

    // ALWAYS filter by approved — buyers never see pending or rejected
    const filter = { status: 'approved' };

    if (landType) filter.landType = landType;
    if (state)    filter.state    = state;
    if (search)   filter.title    = { $regex: search, $options: 'i' };
    if (minPrice || maxPrice) {
      filter.startingPrice = {};
      if (minPrice) filter.startingPrice.$gte = Number(minPrice);
      if (maxPrice) filter.startingPrice.$lte = Number(maxPrice);
    }

    const lands = await Land.find(filter)
      .populate('seller', 'name')
      .sort('-createdAt');

    res.json({ success: true, lands });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch listings.' });
  }
};

// GET /api/lands/my — seller sees ONLY their own listings (all statuses)
exports.getMyLands = async (req, res) => {
  try {
    // req.user._id comes from the protect middleware — guaranteed to be the logged in seller
    const lands = await Land.find({ seller: req.user._id }).sort('-createdAt');
    res.json({ success: true, lands });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch your listings.' });
  }
};

// GET /api/lands/:id — single land detail
// Buyers can only see approved lands
// Seller can see their own land regardless of status
exports.getLandById = async (req, res) => {
  try {
    const land = await Land.findById(req.params.id).populate('seller', 'name email');
    if (!land) return res.status(404).json({ error: 'Land not found.' });

    const requestingUser = req.user;

    // If land is not approved, only the seller or admin can see it
    if (land.status !== 'approved') {
      if (!requestingUser) {
        return res.status(403).json({ error: 'This listing is not available.' });
      }
      const isOwner = land.seller._id.toString() === requestingUser._id.toString();
      const isAdmin = requestingUser.role === 'admin';
      if (!isOwner && !isAdmin) {
        return res.status(403).json({ error: 'This listing is not available.' });
      }
    }

    res.json({ success: true, land });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch listing.' });
  }
};

// DELETE /api/lands/:id — seller deletes their own pending listing
exports.deleteLand = async (req, res) => {
  try {
    const land = await Land.findById(req.params.id);
    if (!land) return res.status(404).json({ error: 'Land not found.' });

    // Only the seller who owns it can delete
    if (land.seller.toString() !== req.user._id.toString())
      return res.status(403).json({ error: 'Not authorized.' });

    // Cannot delete approved listings — need admin to handle those
    if (land.status === 'approved')
      return res.status(400).json({ error: 'Cannot delete an approved listing.' });

    // Delete photos from disk
    land.photos.forEach(photoPath => {
      const fullPath = path.join(__dirname, '../../', photoPath);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    });

    await land.deleteOne();
    res.json({ success: true, message: 'Listing deleted.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete listing.' });
  }
};
// POST /api/lands/:id/documents — seller uploads a document
exports.uploadDocument = async (req, res) => {
  try {
    const land = await Land.findById(req.params.id);
    if (!land) return res.status(404).json({ error: 'Land not found.' });
    if (land.seller.toString() !== req.user._id.toString())
      return res.status(403).json({ error: 'Not authorized.' });
    if (!req.file)
      return res.status(400).json({ error: 'Please upload a file.' });

    const { docType } = req.body;
    if (!docType)
      return res.status(400).json({ error: 'Document type is required.' });

    land.documents.push({
      type:     docType,
      filename: req.file.originalname,
      path:     `/uploads/documents/${req.file.filename}`
    });

    land.calculateTrustScore();
    await land.save();

    res.json({ success: true, trustScore: land.trustScore, documents: land.documents });
  } catch (error) {
    console.error('Upload document error:', error);
    res.status(500).json({ error: 'Failed to upload document.' });
  }
};

// PUT /api/lands/:id/documents/:docId/verify — admin verifies a document
exports.verifyDocument = async (req, res) => {
  try {
    const land = await Land.findById(req.params.id);
    if (!land) return res.status(404).json({ error: 'Land not found.' });

    const doc = land.documents.id(req.params.docId);
    if (!doc) return res.status(404).json({ error: 'Document not found.' });

    doc.verified = true;
    land.calculateTrustScore();
    await land.save();

    res.json({ success: true, trustScore: land.trustScore, document: doc });
  } catch (error) {
    res.status(500).json({ error: 'Failed to verify document.' });
  }
};
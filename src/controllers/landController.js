const Land = require('../models/Land');
const path = require('path');
const fs   = require('fs');

// POST /api/lands — seller creates a land listing
exports.createLand = async (req, res) => {
  try {
    const {
      title, description, location, state,
      area, areaUnit, surveyNumber, landType,
      startingPrice, facing, roadAccess,
      waterSource, electricity
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
      listingFeeUTR:    req.body.listingFeeUTR  || null,
      listingFeePaid:   !!req.body.listingFeeUTR,
      listingFeePaidAt: req.body.listingFeeUTR ? new Date() : null,
      facing,
      roadAccess:    roadAccess  === 'true',
      waterSource:   waterSource === 'true',
      electricity:   electricity === 'true',
    });

    res.status(201).json({ success: true, land });
  } catch (error) {
    console.error('Create land error:', error);
    res.status(500).json({ error: 'Failed to create listing. Please try again.' });
  }
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
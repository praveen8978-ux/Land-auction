const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/landController');
const { protect, sellerOnly, adminOnly } = require('../middleware/auth');
const { uploadPhotos, uploadDocuments } = require('../middleware/upload');
const { valuateLand } = require('../services/valuationService');

const optionalAuth = async (req, res, next) => {
  try {
    const jwt  = require('jsonwebtoken');
    const User = require('../models/User');
    const token = req.session?.token;
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
    }
  } catch {}
  next();
};

// AI valuation
router.post('/valuate', protect, sellerOnly, async (req, res) => {
  try {
    const { location, state, area, areaUnit, landType, facing, roadAccess, waterSource, electricity } = req.body;
    if (!location || !state || !area || !landType)
      return res.status(400).json({ error: 'Location, state, area and land type are required.' });
    const valuation = await valuateLand({
      location, state, area, areaUnit: areaUnit || 'acres',
      landType, facing,
      roadAccess:  roadAccess  === 'true' || roadAccess  === true,
      waterSource: waterSource === 'true' || waterSource === true,
      electricity: electricity === 'true' || electricity === true
    });
    res.json({ success: true, valuation });
  } catch (error) {
    console.error('Valuation error:', error);
    res.status(500).json({ error: 'Valuation failed. Please try again.' });
  }
});

router.get('/',    controller.getLands);
router.get('/my',  protect, sellerOnly, controller.getMyLands);
router.get('/:id', optionalAuth, controller.getLandById);

// Create land with photos
router.post('/',
  protect,
  sellerOnly,
  uploadPhotos.array('photos', 6),
  controller.createLand
);

// Upload documents to existing land
router.post('/:id/documents',
  protect,
  sellerOnly,
  uploadDocuments.single('document'),
  controller.uploadDocument
);

// Admin verify a document
router.put('/:id/documents/:docId/verify',
  protect,
  adminOnly,
  controller.verifyDocument
);

router.delete('/:id', protect, sellerOnly, controller.deleteLand);

module.exports = router;
const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/landController');
const { protect, sellerOnly } = require('../middleware/auth');
const upload     = require('../middleware/upload');
const { valuateLand } = require('../services/valuationService');

// Optional auth middleware — attaches user if logged in but doesn't block if not
const optionalAuth = async (req, res, next) => {
  try {
    const jwt  = require('jsonwebtoken');
    const User = require('../models/User');
    const token = req.session?.token;
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
    }
  } catch {
    // Not logged in — that's fine for public routes
  }
  next();
};


// POST /api/lands/valuate — AI valuation (seller only, no DB save)
router.post('/valuate', protect, sellerOnly, async (req, res) => {
  try {
    const { location, state, area, areaUnit, landType, facing, roadAccess, waterSource, electricity } = req.body;

    if (!location || !state || !area || !landType) {
      return res.status(400).json({ error: 'Location, state, area and land type are required for valuation.' });
    }

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

router.get('/',      controller.getLands);                          // public — approved only
router.get('/my',    protect, sellerOnly, controller.getMyLands);  // seller only — their own
router.get('/:id',   optionalAuth, controller.getLandById);        // smart — depends on status



router.post('/',
  protect,
  sellerOnly,
  upload.array('photos', 6),
  controller.createLand
);

router.delete('/:id', protect, sellerOnly, controller.deleteLand);

module.exports = router;
const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/auctionController');
const { protect, adminOnly } = require('../middleware/auth');

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

router.get('/',           optionalAuth, controller.getAuctions);
router.get('/:id',        optionalAuth, controller.getAuction);
router.post('/',          protect, adminOnly, controller.createAuction);
router.post('/:id/bid',   protect, controller.placeBid);
router.put('/:id/status', protect, adminOnly, controller.updateStatus);

module.exports = router;
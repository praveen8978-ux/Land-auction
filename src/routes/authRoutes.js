const express     = require('express');
const router      = express.Router();
const controller  = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register',   controller.register);
router.post('/login',      controller.login);
router.post('/verify-otp', controller.verifyOTP);
router.post('/resend-otp', controller.resendOTP);
router.post('/logout',     controller.logout);
router.get('/me',          protect, controller.getMe);
router.post('/forgot-password',    controller.forgotPassword);
router.post('/verify-reset-otp',   controller.verifyResetOTP);
router.post('/reset-password',     controller.resetPassword);

// Add these routes
router.put('/location',    protect, async (req, res) => {
  try {
    const { lat, lng, address } = req.body;
    if (!lat || !lng) return res.status(400).json({ error: 'Coordinates required.' });

    const User = require('../models/User');
    await User.findByIdAndUpdate(req.user._id, {
      location: { lat: Number(lat), lng: Number(lng), address }
    });

    res.json({ success: true, message: 'Location updated.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update location.' });
  }
});

router.put('/location-alerts', protect, async (req, res) => {
  try {
    const { enabled } = req.body;
    const User = require('../models/User');
    await User.findByIdAndUpdate(req.user._id, { locationAlerts: enabled });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update preference.' });
  }
});

module.exports = router;
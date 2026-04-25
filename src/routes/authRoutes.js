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

module.exports = router;
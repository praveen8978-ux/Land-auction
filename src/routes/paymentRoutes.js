const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/paymentController');
const { protect, adminOnly } = require('../middleware/auth');

router.post('/create-order',           protect, controller.createPaymentOrder);
router.post('/verify',                 protect, controller.verifyPayment);
router.post('/confirm/:auctionId',     protect, adminOnly, controller.confirmOwnership);
router.get('/status/:auctionId',       protect, controller.getPaymentStatus);

module.exports = router;
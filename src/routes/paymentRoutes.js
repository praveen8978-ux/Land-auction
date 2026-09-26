const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/paymentController');
const { protect, adminOnly } = require('../middleware/auth');

router.post('/submit',                 protect, controller.submitPayment);
router.post('/confirm/:auctionId',     protect, adminOnly, controller.confirmOwnership);
router.get('/status/:auctionId',       protect, controller.getPaymentStatus);

module.exports = router;
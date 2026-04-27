const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/consortiumController');
const { protect } = require('../middleware/auth');

router.post('/',                          protect, controller.createConsortium);
router.get('/my',                         protect, controller.getMyConsortiums);
router.get('/auction/:auctionId',         protect, controller.getAuctionConsortiums);
router.post('/:id/join',                  protect, controller.joinConsortium);
router.post('/:id/bid',                   protect, controller.placeBid);

module.exports = router;
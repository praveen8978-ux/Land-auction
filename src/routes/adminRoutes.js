const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect, adminOnly);

router.get('/dashboard',           controller.getDashboard);
router.get('/lands',               controller.getLands);
router.put('/lands/:id/approve',   controller.approveLand);
router.put('/lands/:id/reject',    controller.rejectLand);
router.get('/users',               controller.getUsers);
router.put('/users/:id/role',      controller.changeUserRole);

module.exports = router;
const Land    = require('../models/Land');
const User    = require('../models/User');
const Auction = require('../models/Auction');

exports.getDashboard = async (req, res) => {
  try {
    const [
      totalUsers,
      totalLands,
      pendingLands,
      approvedLands,
      totalAuctions,
      liveAuctions
    ] = await Promise.all([
      User.countDocuments(),
      Land.countDocuments(),
      Land.countDocuments({ status: 'pending' }),
      Land.countDocuments({ status: 'approved' }),
      Auction.countDocuments(),
      Auction.countDocuments({ status: 'live' })
    ]);

    res.json({
      success: true,
      stats: { totalUsers, totalLands, pendingLands, approvedLands, totalAuctions, liveAuctions }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats.' });
  }
};

exports.getLands = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const lands = await Land.find(filter)
      .populate('seller', 'name email')
      .sort('-createdAt');
    res.json({ success: true, lands });
  } catch (error) {
    console.error('Get lands error:', error);
    res.status(500).json({ error: 'Failed to fetch lands.' });
  }
};

exports.approveLand = async (req, res) => {
  try {
    const land = await Land.findById(req.params.id);
    if (!land) return res.status(404).json({ error: 'Land not found.' });
    if (land.status !== 'pending')
      return res.status(400).json({ error: 'Only pending listings can be approved.' });

    land.status = 'approved';
    await land.save();
    res.json({ success: true, message: 'Listing approved.', land });
  } catch (error) {
    console.error('Approve error:', error);
    res.status(500).json({ error: 'Failed to approve listing.' });
  }
};

exports.rejectLand = async (req, res) => {
  try {
    const { reason } = req.body;
    const land = await Land.findById(req.params.id);
    if (!land) return res.status(404).json({ error: 'Land not found.' });

    land.status          = 'rejected';
    land.rejectionReason = reason || 'Does not meet listing requirements.';
    await land.save();
    res.json({ success: true, message: 'Listing rejected.', land });
  } catch (error) {
    console.error('Reject error:', error);
    res.status(500).json({ error: 'Failed to reject listing.' });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort('-createdAt');
    res.json({ success: true, users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
};

exports.changeUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!['buyer', 'seller', 'admin'].includes(role))
      return res.status(400).json({ error: 'Invalid role.' });

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select('-password');

    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({ success: true, user });
  } catch (error) {
    console.error('Role change error:', error);
    res.status(500).json({ error: 'Failed to update role.' });
  }
};
const Consortium = require('../models/Consortium');
const Auction    = require('../models/Auction');
const Bid        = require('../models/Bid');

// POST /api/consortiums — create a new consortium
exports.createConsortium = async (req, res) => {
  try {
    const { auctionId, name, targetAmount, contribution, maxMembers } = req.body;

    if (!auctionId || !name || !targetAmount || !contribution)
      return res.status(400).json({ error: 'All fields are required.' });

    const auction = await Auction.findById(auctionId);
    if (!auction)
      return res.status(404).json({ error: 'Auction not found.' });
    if (auction.status !== 'live')
      return res.status(400).json({ error: 'Can only create consortium for live auctions.' });
    if (Number(contribution) > Number(targetAmount))
      return res.status(400).json({ error: 'Contribution cannot exceed target amount.' });

    // Check user not already in a consortium for this auction
    const existing = await Consortium.findOne({
      auction: auctionId,
      'members.user': req.user._id,
      status: { $in: ['open', 'ready', 'bidding'] }
    });
    if (existing)
      return res.status(400).json({ error: 'You are already in a consortium for this auction.' });

    const consortium = await Consortium.create({
      auction:      auctionId,
      name,
      createdBy:    req.user._id,
      targetAmount: Number(targetAmount),
      maxMembers:   Number(maxMembers) || 5,
      members: [{
        user:         req.user._id,
        contribution: Number(contribution)
      }]
    });

    consortium.recalculatePercentages();
    await consortium.save();

    await consortium.populate('members.user', 'name email');
    await consortium.populate('createdBy', 'name');

    res.status(201).json({ success: true, consortium });
  } catch (error) {
    console.error('Create consortium error:', error);
    res.status(500).json({ error: 'Failed to create consortium.' });
  }
};

// GET /api/consortiums/auction/:auctionId — get all consortiums for an auction
exports.getAuctionConsortiums = async (req, res) => {
  try {
    const consortiums = await Consortium.find({
      auction: req.params.auctionId,
      status:  { $in: ['open', 'ready'] }
    })
      .populate('members.user', 'name')
      .populate('createdBy', 'name')
      .sort('-createdAt');

    res.json({ success: true, consortiums });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch consortiums.' });
  }
};

// POST /api/consortiums/:id/join — join an existing consortium
exports.joinConsortium = async (req, res) => {
  try {
    const { contribution } = req.body;
    if (!contribution)
      return res.status(400).json({ error: 'Contribution amount is required.' });

    const consortium = await Consortium.findById(req.params.id);
    if (!consortium)
      return res.status(404).json({ error: 'Consortium not found.' });
    if (consortium.status !== 'open')
      return res.status(400).json({ error: 'This consortium is no longer accepting members.' });
    if (consortium.members.length >= consortium.maxMembers)
      return res.status(400).json({ error: 'Consortium is full.' });

    const alreadyMember = consortium.members.some(
      m => m.user.toString() === req.user._id.toString()
    );
    if (alreadyMember)
      return res.status(400).json({ error: 'You are already a member of this consortium.' });

    // Check not already in another consortium for same auction
    const existing = await Consortium.findOne({
      auction: consortium.auction,
      'members.user': req.user._id,
      status: { $in: ['open', 'ready', 'bidding'] },
      _id: { $ne: consortium._id }
    });
    if (existing)
      return res.status(400).json({ error: 'You are already in another consortium for this auction.' });

    consortium.members.push({
      user:         req.user._id,
      contribution: Number(contribution)
    });

    consortium.recalculatePercentages();
    await consortium.save();

    await consortium.populate('members.user', 'name');
    await consortium.populate('createdBy', 'name');

    res.json({ success: true, consortium });
  } catch (error) {
    console.error('Join consortium error:', error);
    res.status(500).json({ error: 'Failed to join consortium.' });
  }
};

// POST /api/consortiums/:id/bid — place a group bid
exports.placeBid = async (req, res) => {
  try {
    const consortium = await Consortium.findById(req.params.id)
      .populate('members.user', 'name');

    if (!consortium)
      return res.status(404).json({ error: 'Consortium not found.' });
    if (consortium.status !== 'ready')
      return res.status(400).json({ error: 'Consortium has not reached its target amount yet.' });
    if (consortium.bidPlaced)
      return res.status(400).json({ error: 'A bid has already been placed by this consortium.' });

    // Only creator can place the bid
    if (consortium.createdBy.toString() !== req.user._id.toString())
      return res.status(403).json({ error: 'Only the consortium creator can place the bid.' });

    const auction = await Auction.findById(consortium.auction);
    if (!auction || auction.status !== 'live')
      return res.status(400).json({ error: 'Auction is not live.' });
    if (consortium.raisedAmount <= auction.currentPrice)
      return res.status(400).json({ error: `Consortium amount must be higher than current price ₹${auction.currentPrice.toLocaleString('en-IN')}.` });

    // Place the bid
    const bid = await Bid.create({
      auction:  auction._id,
      bidder:   req.user._id,
      amount:   consortium.raisedAmount,
      isGroup:  true,
      groupName: consortium.name
    });

    auction.currentPrice = consortium.raisedAmount;
    auction.totalBids   += 1;
    await auction.save();

    consortium.bidPlaced = true;
    consortium.status    = 'bidding';
    await consortium.save();

    // Emit real-time event
    req.app.get('io').to(auction._id.toString()).emit('newBid', {
      amount:    consortium.raisedAmount,
      bidder:    `${consortium.name} (Group of ${consortium.members.length})`,
      bidderId:  req.user._id,
      timestamp: new Date(),
      totalBids: auction.totalBids,
      isGroup:   true
    });

    res.json({ success: true, bid, newPrice: auction.currentPrice });
  } catch (error) {
    console.error('Consortium bid error:', error);
    res.status(500).json({ error: 'Failed to place group bid.' });
  }
};

// GET /api/consortiums/my — get user's consortiums
exports.getMyConsortiums = async (req, res) => {
  try {
    const consortiums = await Consortium.find({
      'members.user': req.user._id
    })
      .populate('auction', 'status currentPrice endTime')
      .populate('members.user', 'name')
      .sort('-createdAt');

    res.json({ success: true, consortiums });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch your consortiums.' });
  }
};
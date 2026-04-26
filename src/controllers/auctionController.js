const Auction = require('../models/Auction');
const Bid     = require('../models/Bid');
const Land    = require('../models/Land');

// GET /api/auctions — all live and upcoming auctions
exports.getAuctions = async (req, res) => {
  try {
    const { status, landType, state } = req.query;
    const filter = {};
    if (status)   filter.status = status;
    else          filter.status = { $in: ['live', 'upcoming'] };

    const auctions = await Auction.find(filter)
      .populate({
        path: 'land',
        match: landType || state
          ? { ...(landType && { landType }), ...(state && { state }) }
          : {},
        populate: { path: 'seller', select: 'name' }
      })
      .sort({ status: -1, startTime: 1 });

    // Filter out nulls (land didn't match the filter)
    const filtered = auctions.filter(a => a.land !== null);
    res.json({ success: true, auctions: filtered });
  } catch (error) {
    console.error('Get auctions error:', error);
    res.status(500).json({ error: 'Failed to fetch auctions.' });
  }
};

// GET /api/auctions/:id — single auction with bids
exports.getAuction = async (req, res) => {
  try {
    const auction = await Auction.findById(req.params.id)
      .populate({ path: 'land', populate: { path: 'seller', select: 'name email' } })
      .populate('winner', 'name');

    if (!auction) return res.status(404).json({ error: 'Auction not found.' });

    const bids = await Bid.find({ auction: auction._id })
      .populate('bidder', 'name')
      .sort('-placedAt')
      .limit(20);

    res.json({ success: true, auction, bids });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch auction.' });
  }
};

// POST /api/auctions — admin creates auction for an approved land
exports.createAuction = async (req, res) => {
  try {
    const { landId, startTime, endTime } = req.body;

    const land = await Land.findById(landId);
    if (!land) return res.status(404).json({ error: 'Land not found.' });
    if (land.status !== 'approved')
      return res.status(400).json({ error: 'Land must be approved before creating auction.' });

    const existing = await Auction.findOne({ land: landId, status: { $in: ['upcoming', 'live'] } });
    if (existing)
      return res.status(400).json({ error: 'An active auction already exists for this land.' });

    const auction = await Auction.create({
      land:          landId,
      startingPrice: land.startingPrice,
      currentPrice:  land.startingPrice,
      startTime:     new Date(startTime),
      endTime:       new Date(endTime),
      createdBy:     req.user._id,
      status:        new Date(startTime) <= new Date() ? 'live' : 'upcoming'
    });

    await auction.populate({ path: 'land', populate: { path: 'seller', select: 'name' } });
    res.status(201).json({ success: true, auction });
  } catch (error) {
    console.error('Create auction error:', error);
    res.status(500).json({ error: 'Failed to create auction.' });
  }
};

// POST /api/auctions/:id/bid — place a bid
exports.placeBid = async (req, res) => {
  try {
    const { amount } = req.body;
    const auction = await Auction.findById(req.params.id);

    if (!auction)
      return res.status(404).json({ error: 'Auction not found.' });
    if (auction.status !== 'live')
      return res.status(400).json({ error: 'This auction is not live.' });
    if (new Date() > auction.endTime)
      return res.status(400).json({ error: 'This auction has ended.' });
    if (Number(amount) <= auction.currentPrice)
      return res.status(400).json({ error: `Bid must be higher than current price ₹${auction.currentPrice.toLocaleString('en-IN')}.` });

    const bid = await Bid.create({
      auction: auction._id,
      bidder:  req.user._id,
      amount:  Number(amount)
    });

    auction.currentPrice = Number(amount);
    auction.totalBids    += 1;
    await auction.save();

    await bid.populate('bidder', 'name');

    // Emit real-time event to all watching this auction
    req.app.get('io').to(auction._id.toString()).emit('newBid', {
      amount:    Number(amount),
      bidder:    req.user.name,
      bidderId:  req.user._id,
      timestamp: new Date(),
      totalBids: auction.totalBids
    });

    res.json({ success: true, bid, newPrice: auction.currentPrice });
  } catch (error) {
    console.error('Place bid error:', error);
    res.status(500).json({ error: 'Failed to place bid.' });
  }
};

// PUT /api/auctions/:id/status — admin updates auction status
exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const auction = await Auction.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!auction) return res.status(404).json({ error: 'Auction not found.' });
    res.json({ success: true, auction });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update status.' });
  }
};
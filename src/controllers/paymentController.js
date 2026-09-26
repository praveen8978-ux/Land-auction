const Auction = require('../models/Auction');
const Land    = require('../models/Land');
const User    = require('../models/User');
const { sendPaymentSubmittedEmails, sendOwnershipTransferEmail } = require('../services/emailService');

// POST /api/payments/submit
// Winner submits their UPI UTR / transaction ID after paying manually
exports.submitPayment = async (req, res) => {
  try {
    const { auctionId, utr } = req.body;

    if (!utr || !utr.trim())
      return res.status(400).json({ error: 'UTR / transaction ID is required.' });

    const auction = await Auction.findById(auctionId)
      .populate('winner', 'name email')
      .populate({ path: 'land', populate: { path: 'seller', select: 'name email' } });

    if (!auction)
      return res.status(404).json({ error: 'Auction not found.' });
    if (auction.status !== 'ended')
      return res.status(400).json({ error: 'Auction has not ended yet.' });
    if (!auction.winner)
      return res.status(400).json({ error: 'No winner for this auction.' });
    if (auction.winner._id.toString() !== req.user._id.toString())
      return res.status(403).json({ error: 'Only the auction winner can make this payment.' });
    if (auction.paymentStatus === 'confirmed')
      return res.status(400).json({ error: 'Payment already confirmed.' });

    // Record the manual payment — admin will verify and confirm ownership
    auction.paymentStatus = 'paid';
    auction.paymentUTR    = utr.trim();
    auction.paymentDate   = new Date();
    await auction.save();

    // Send confirmation emails asynchronously — never block or fail the response on email issues
    sendPaymentSubmittedEmails({
      winnerEmail: auction.winner.email,
      winnerName:  auction.winner.name,
      sellerEmail: auction.land.seller.email,
      sellerName:  auction.land.seller.name,
      landTitle:   auction.land.title,
      amount:      auction.currentPrice,
      utr:         utr.trim()
    }).catch(err => console.error('Payment email send error:', err));

    // Emit real time notification
    req.app.get('io').emit('paymentReceived', {
      auctionId,
      amount: auction.currentPrice,
      winner: auction.winner.name
    });

    res.json({
      success: true,
      message: 'Payment details submitted. We will verify and confirm shortly.',
      paymentUTR: auction.paymentUTR
    });
  } catch (error) {
    console.error('Submit payment error:', error);
    res.status(500).json({ error: 'Failed to submit payment.' });
  }
};

// POST /api/payments/confirm/:auctionId — admin verifies UTR and transfers ownership
exports.confirmOwnership = async (req, res) => {
  try {
    const auction = await Auction.findById(req.params.auctionId)
      .populate('winner', 'name email')
      .populate({ path: 'land', populate: { path: 'seller', select: 'name email' } });

    if (!auction)
      return res.status(404).json({ error: 'Auction not found.' });
    if (auction.paymentStatus !== 'paid')
      return res.status(400).json({ error: 'Payment not received yet.' });

    // Confirm payment and transfer ownership
    auction.paymentStatus = 'confirmed';
    await auction.save();

    // Mark land as sold
    await Land.findByIdAndUpdate(auction.land._id, { status: 'sold' });

    // Send ownership transfer email asynchronously — don't let an email hiccup block this response
    sendOwnershipTransferEmail({
      winnerEmail: auction.winner.email,
      winnerName:  auction.winner.name,
      landTitle:   auction.land.title,
      sellerName:  auction.land.seller.name,
      sellerEmail: auction.land.seller.email,
      amount:      auction.currentPrice
    }).catch(err => console.error('Ownership transfer email send error:', err));

    res.json({ success: true, message: 'Ownership transferred successfully.' });
  } catch (error) {
    console.error('Confirm ownership error:', error);
    res.status(500).json({ error: 'Failed to confirm ownership.' });
  }
};

// GET /api/payments/status/:auctionId
exports.getPaymentStatus = async (req, res) => {
  try {
    const auction = await Auction.findById(req.params.auctionId)
      .select('paymentStatus paymentUTR currentPrice winner status')
      .populate('winner', 'name');

    if (!auction) return res.status(404).json({ error: 'Auction not found.' });

    res.json({ success: true, paymentStatus: auction.paymentStatus, auction });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get payment status.' });
  }
};
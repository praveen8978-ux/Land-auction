const { createOrder, verifyPayment } = require('../services/paymentService');
const Auction = require('../models/Auction');
const Land    = require('../models/Land');
const User    = require('../models/User');
const { sendOTPEmail } = require('../services/emailService');

// POST /api/payments/create-order
// Winner calls this to create a Razorpay order
exports.createPaymentOrder = async (req, res) => {
  try {
    const { auctionId } = req.body;

    const auction = await Auction.findById(auctionId)
      .populate('winner',  'name email')
      .populate('land',    'title seller startingPrice')
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

    // Create Razorpay order
    const order = await createOrder(
      auction.currentPrice,
      `auction_${auctionId}`,
      {
        auctionId: auctionId,
        landTitle: auction.land.title,
        winnerId:  req.user._id.toString(),
        winnerName: req.user.name
      }
    );

    // Save order ID to auction
    auction.razorpayOrderId = order.id;
    await auction.save();

    res.json({
      success:  true,
      orderId:  order.id,
      amount:   order.amount,
      currency: order.currency,
      keyId:    process.env.RAZORPAY_KEY_ID,
      prefill: {
        name:  req.user.name,
        email: req.user.email
      },
      land: {
        title:  auction.land.title,
        seller: auction.land.seller.name
      }
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Failed to create payment order.' });
  }
};

// POST /api/payments/verify
// Called after Razorpay payment is completed
exports.verifyPayment = async (req, res) => {
  try {
    const {
      auctionId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body;

    // Verify payment signature
    const isValid = verifyPayment(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValid)
      return res.status(400).json({ error: 'Payment verification failed. Invalid signature.' });

    const auction = await Auction.findById(auctionId)
      .populate('winner', 'name email')
      .populate({ path: 'land', populate: { path: 'seller', select: 'name email' } });

    if (!auction)
      return res.status(404).json({ error: 'Auction not found.' });

    // Update auction payment status
    auction.paymentStatus    = 'paid';
    auction.paymentId        = razorpay_payment_id;
    auction.razorpayOrderId  = razorpay_order_id;
    auction.paymentDate      = new Date();
    await auction.save();

    // Send confirmation emails
    const winnerEmail = {
      to:      auction.winner.email,
      subject: 'Payment confirmed — Land Auction',
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
          <h2 style="color: #2563eb;">Payment Successful!</h2>
          <p>Hi ${auction.winner.name}, your payment of <strong>₹${auction.currentPrice.toLocaleString('en-IN')}</strong> for <strong>${auction.land.title}</strong> has been received.</p>
          <p>Payment ID: <code>${razorpay_payment_id}</code></p>
          <p>Our team will process the land ownership transfer within 24-48 hours.</p>
        </div>
      `
    };

    const sellerEmail = {
      to:      auction.land.seller.email,
      subject: 'Payment received for your land — Land Auction',
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
          <h2 style="color: #16a34a;">Payment Received!</h2>
          <p>Hi ${auction.land.seller.name}, the buyer has paid <strong>₹${auction.currentPrice.toLocaleString('en-IN')}</strong> for your land <strong>${auction.land.title}</strong>.</p>
          <p>Payment ID: <code>${razorpay_payment_id}</code></p>
          <p>Buyer: ${auction.winner.name} (${auction.winner.email})</p>
          <p>The funds will be transferred to you after ownership verification.</p>
        </div>
      `
    };

    // Send emails asynchronously
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });

    Promise.all([
      transporter.sendMail({ from: `"Land Auction" <${process.env.EMAIL_USER}>`, ...winnerEmail }),
      transporter.sendMail({ from: `"Land Auction" <${process.env.EMAIL_USER}>`, ...sellerEmail })
    ]).catch(err => console.error('Email send error:', err));

    // Emit real time notification
    req.app.get('io').emit('paymentReceived', {
      auctionId,
      amount: auction.currentPrice,
      winner: auction.winner.name
    });

    res.json({
      success:   true,
      message:   'Payment verified successfully.',
      paymentId: razorpay_payment_id
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ error: 'Payment verification failed.' });
  }
};

// POST /api/payments/confirm/:auctionId — admin confirms and transfers ownership
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

    // Send ownership transfer email to winner
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });

    await transporter.sendMail({
      from:    `"Land Auction" <${process.env.EMAIL_USER}>`,
      to:      auction.winner.email,
      subject: 'Land ownership transferred — Land Auction',
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
          <h2 style="color: #16a34a;">Congratulations! 🎉</h2>
          <p>Hi ${auction.winner.name}, ownership of <strong>${auction.land.title}</strong> has been officially transferred to you.</p>
          <p>Please contact the seller to complete the registration process:</p>
          <p><strong>${auction.land.seller.name}</strong> — ${auction.land.seller.email}</p>
          <p>Amount paid: ₹${auction.currentPrice.toLocaleString('en-IN')}</p>
        </div>
      `
    });

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
      .select('paymentStatus paymentId currentPrice winner status')
      .populate('winner', 'name');

    if (!auction) return res.status(404).json({ error: 'Auction not found.' });

    res.json({ success: true, paymentStatus: auction.paymentStatus, auction });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get payment status.' });
  }
};
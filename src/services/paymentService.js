const Razorpay = require('razorpay');
const crypto   = require('crypto');

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Create a Razorpay order
const createOrder = async (amountInRupees, receipt, notes = {}) => {
  const order = await razorpay.orders.create({
    amount:   amountInRupees * 100, // Razorpay uses paise
    currency: 'INR',
    receipt,
    notes
  });
  return order;
};

// Verify payment signature after payment
const verifyPayment = (orderId, paymentId, signature) => {
  const body      = orderId + '|' + paymentId;
  const expected  = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');
  return expected === signature;
};

module.exports = { createOrder, verifyPayment };
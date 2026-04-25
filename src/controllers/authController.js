const User            = require('../models/User');
const jwt             = require('jsonwebtoken');
const crypto          = require('crypto');
const { sendOTPEmail } = require('../services/emailService');

const createToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

// POST /api/auth/register — validates then sends OTP
exports.register = async (req, res) => {
  const { name, email, password, confirmPassword, role } = req.body;

  if (!name || !email || !password || !confirmPassword)
    return res.status(400).json({ error: 'All fields are required' });
  if (password !== confirmPassword)
    return res.status(400).json({ error: 'Passwords do not match' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters' });

  try {
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser)
      return res.status(400).json({ error: 'An account with this email already exists' });

    // Save full form data in session temporarily — don't create user yet
    req.session.pendingUser = { name, email, password, role: role || 'buyer' };

    // Generate OTP
    const otp = generateOTP();
    req.session.pendingOTP       = otp;
    req.session.pendingOTPExpiry = new Date(Date.now() + 3 * 60 * 1000).toISOString();

    // Send OTP email
    await sendOTPEmail(email, otp, name);

    console.log(`Registration OTP sent to ${email}`);

    res.status(200).json({
      success:  true,
      message:  'OTP sent to your email',
      redirect: '/verify-otp'
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
};

// POST /api/auth/login — validates password then sends OTP
exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ error: 'Email and password are required' });

  try {
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ error: 'Invalid email or password' });

    // Generate OTP and set 3 minute expiry
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 3 * 60 * 1000);

    // Save OTP to user record
    user.otp       = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    // Send OTP email
    await sendOTPEmail(user.email, otp, user.name);

    // Store email in session temporarily so OTP verify knows who to check
    req.session.pendingEmail = user.email;

    console.log(`OTP sent to ${user.email}`);

    res.json({
      success:  true,
      message:  'OTP sent to your email',
      redirect: '/verify-otp'
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
};

// POST /api/auth/verify-otp — checks OTP and creates session
// POST /api/auth/verify-otp — handles both register and login OTP
exports.verifyOTP = async (req, res) => {
  const { otp } = req.body;

  if (!otp)
    return res.status(400).json({ error: 'Please enter the OTP.' });

  // ── REGISTRATION FLOW ──
  if (req.session.pendingUser) {
    const { pendingOTP, pendingOTPExpiry, pendingUser } = req.session;

    if (!pendingOTP || !pendingOTPExpiry)
      return res.status(400).json({ error: 'Session expired. Please register again.' });

    if (new Date(pendingOTPExpiry) < new Date())
      return res.status(400).json({ error: 'OTP has expired. Please register again.' });

    if (pendingOTP !== otp)
      return res.status(400).json({ error: 'Invalid OTP. Please try again.' });

    try {
      // Now create the user after OTP is verified
      const user = await User.create(pendingUser);

      // Clear pending registration data from session
      delete req.session.pendingUser;
      delete req.session.pendingOTP;
      delete req.session.pendingOTPExpiry;

      // Create login session
      const token = createToken(user._id);
      req.session.token = token;

      return res.json({
        success: true,
        user: { id: user._id, name: user.name, email: user.email, role: user.role }
      });
    } catch (error) {
      console.error('Register verify error:', error);
      return res.status(500).json({ error: 'Account creation failed. Please try again.' });
    }
  }

  // ── LOGIN FLOW ──
  const email = req.session.pendingEmail;

  if (!email)
    return res.status(400).json({ error: 'Session expired. Please log in again.' });

  try {
    const user = await User.findOne({ email });

    if (!user)
      return res.status(400).json({ error: 'User not found.' });

    if (!user.otpExpiry || user.otpExpiry < new Date())
      return res.status(400).json({ error: 'OTP has expired. Please log in again.' });

    if (user.otp !== otp)
      return res.status(400).json({ error: 'Invalid OTP. Please try again.' });

    // Clear OTP after use
    user.otp       = undefined;
    user.otpExpiry = undefined;
    await user.save();

    delete req.session.pendingEmail;

    const token = createToken(user._id);
    req.session.token = token;

    return res.json({
      success: true,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error('OTP verify error:', error);
    res.status(500).json({ error: 'Verification failed. Please try again.' });
  }
};

// POST /api/auth/resend-otp
// POST /api/auth/resend-otp
exports.resendOTP = async (req, res) => {
  // ── REGISTRATION RESEND ──
  if (req.session.pendingUser) {
    const { name, email } = req.session.pendingUser;
    const otp = generateOTP();
    req.session.pendingOTP       = otp;
    req.session.pendingOTPExpiry = new Date(Date.now() + 3 * 60 * 1000).toISOString();

    try {
      await sendOTPEmail(email, otp, name);
      return res.json({ success: true, message: 'New OTP sent to your email' });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to resend OTP.' });
    }
  }

  // ── LOGIN RESEND ──
  const email = req.session.pendingEmail;
  if (!email)
    return res.status(400).json({ error: 'Session expired. Please log in again.' });

  try {
    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ error: 'User not found.' });

    const otp = generateOTP();
    user.otp       = otp;
    user.otpExpiry = new Date(Date.now() + 3 * 60 * 1000);
    await user.save();

    await sendOTPEmail(user.email, otp, user.name);
    res.json({ success: true, message: 'New OTP sent to your email' });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ error: 'Failed to resend OTP.' });
  }
};

// POST /api/auth/logout
exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error('Logout error:', err);
    res.json({ success: true, message: 'Logged out successfully' });
  });
};

// GET /api/auth/me
exports.getMe = async (req, res) => {
  try {
    const token = req.session.token;
    if (!token) return res.status(401).json({ error: 'Not authenticated' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password -otp -otpExpiry');
    if (!user) return res.status(401).json({ error: 'User not found' });
    res.json({ user });
  } catch (error) {
    res.status(401).json({ error: 'Not authenticated' });
  }
};
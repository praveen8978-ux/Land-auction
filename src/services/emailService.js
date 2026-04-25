const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendOTPEmail = async (email, otp, name) => {
  const mailOptions = {
    from:    `"Land Auction" <${process.env.EMAIL_USER}>`,
    to:      email,
    subject: 'Your login OTP — Land Auction',
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f9fafb; border-radius: 12px;">
        <h2 style="color: #1d4ed8; margin-bottom: 8px;">Land Auction</h2>
        <p style="color: #374151; margin-bottom: 24px;">Hi ${name}, here is your one-time login code:</p>

        <div style="background: white; border: 2px solid #e5e7eb; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
          <p style="font-size: 48px; font-weight: 700; letter-spacing: 12px; color: #1d4ed8; margin: 0;">
            ${otp}
          </p>
        </div>

        <p style="color: #6b7280; font-size: 14px; margin-bottom: 8px;">
          This code expires in <strong>3 minutes</strong>.
        </p>
        <p style="color: #6b7280; font-size: 14px;">
          If you did not try to log in, ignore this email.
        </p>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

module.exports = { sendOTPEmail };
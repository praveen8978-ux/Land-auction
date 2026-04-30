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

const sendLocationAlertEmail = async (email, name, land, distanceKm) => {
  const mailOptions = {
    from:    `"Land Auction" <${process.env.EMAIL_USER}>`,
    to:      email,
    subject: `New land listed ${Math.round(distanceKm)}km from you — Land Auction`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f9fafb; border-radius: 12px;">
        <h2 style="color: #2563eb; margin-bottom: 8px;">Land Auction</h2>
        <p style="color: #374151; margin-bottom: 24px;">Hi ${name}, a new land listing was just posted <strong>${Math.round(distanceKm)}km from your location!</strong></p>

        <div style="background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <h3 style="color: #111827; margin: 0 0 8px 0;">${land.title}</h3>
          <p style="color: #6b7280; font-size: 14px; margin: 0 0 4px 0;">
            📍 ${land.location}, ${land.state}
          </p>
          <p style="color: #6b7280; font-size: 14px; margin: 0 0 4px 0;">
            📐 ${land.area} ${land.areaUnit} · ${land.landType}
          </p>
          <p style="color: #2563eb; font-weight: 600; font-size: 16px; margin: 12px 0 0 0;">
            Starting ₹${land.startingPrice.toLocaleString('en-IN')}
          </p>
        </div>

        <p style="color: #6b7280; font-size: 14px; margin-bottom: 16px;">
          This listing is currently under admin review and will go live for auction soon.
        </p>

        <p style="color: #9ca3af; font-size: 12px;">
          You received this because you enabled location alerts. 
          You can turn this off in your profile settings.
        </p>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

module.exports = { sendOTPEmail, sendLocationAlertEmail };
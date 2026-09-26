const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM || 'Land Auction <onboarding@resend.dev>';

const sendOTPEmail = async (email, otp, name) => {
  await resend.emails.send({
    from:    FROM,
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
  });
};

const sendLocationAlertEmail = async (email, name, land, distanceKm) => {
  await resend.emails.send({
    from:    FROM,
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
  });
};

const sendPaymentSubmittedEmails = async ({ winnerEmail, winnerName, sellerEmail, sellerName, landTitle, amount, utr }) => {
  await Promise.all([
    resend.emails.send({
      from:    FROM,
      to:      winnerEmail,
      subject: 'Payment submitted — Land Auction',
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
          <h2 style="color: #2563eb;">Payment submitted!</h2>
          <p>Hi ${winnerName}, we've received your payment details of <strong>₹${amount.toLocaleString('en-IN')}</strong> for <strong>${landTitle}</strong>.</p>
          <p>Transaction ID: <code>${utr}</code></p>
          <p>Our team will verify the payment and process the land ownership transfer within 24-48 hours.</p>
        </div>
      `
    }),
    resend.emails.send({
      from:    FROM,
      to:      sellerEmail,
      subject: 'Payment submitted for your land — Land Auction',
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
          <h2 style="color: #16a34a;">Payment submitted!</h2>
          <p>Hi ${sellerName}, the buyer has submitted payment of <strong>₹${amount.toLocaleString('en-IN')}</strong> for your land <strong>${landTitle}</strong>.</p>
          <p>Transaction ID: <code>${utr}</code></p>
          <p>Buyer: ${winnerName} (${winnerEmail})</p>
          <p>The funds will be transferred to you after our team verifies the transaction and confirms ownership.</p>
        </div>
      `
    })
  ]);
};

const sendOwnershipTransferEmail = async ({ winnerEmail, winnerName, landTitle, sellerName, sellerEmail, amount }) => {
  await resend.emails.send({
    from:    FROM,
    to:      winnerEmail,
    subject: 'Land ownership transferred — Land Auction',
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #16a34a;">Congratulations! 🎉</h2>
        <p>Hi ${winnerName}, ownership of <strong>${landTitle}</strong> has been officially transferred to you.</p>
        <p>Please contact the seller to complete the registration process:</p>
        <p><strong>${sellerName}</strong> — ${sellerEmail}</p>
        <p>Amount paid: ₹${amount.toLocaleString('en-IN')}</p>
      </div>
    `
  });
};

module.exports = {
  sendOTPEmail,
  sendLocationAlertEmail,
  sendPaymentSubmittedEmails,
  sendOwnershipTransferEmail
};
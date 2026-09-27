/**
 * Email HTML templates for ShareBite donation status notifications.
 * All templates return an { subject, html, text } object.
 */

const BASE_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const brandHeader = `
  <div style="background:linear-gradient(135deg,#5c7a3e,#4a6331);padding:28px 32px;border-radius:12px 12px 0 0;">
    <span style="font-size:28px;">🌱</span>
    <span style="color:#fff;font-size:22px;font-weight:800;letter-spacing:-0.5px;margin-left:8px;font-family:'Segoe UI',sans-serif;">Share<span style="color:#b8d98d;">Bite</span></span>
  </div>
`;

const brandFooter = `
  <div style="background:#f5f0e8;padding:20px 32px;border-radius:0 0 12px 12px;text-align:center;font-family:'Segoe UI',sans-serif;">
    <p style="margin:0;font-size:12px;color:#888;">You're receiving this because you have an account on ShareBite.</p>
    <p style="margin:6px 0 0;font-size:12px;color:#aaa;">© ${new Date().getFullYear()} ShareBite — Reducing food waste, one meal at a time.</p>
  </div>
`;

/**
 * Donation accepted by NGO → notify donor
 */
const donationAccepted = ({ donorName, foodType, ngoName }) => ({
  subject: '✅ Your donation has been accepted! — ShareBite',
  html: `
    <div style="max-width:560px;margin:0 auto;font-family:'Segoe UI',sans-serif;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
      ${brandHeader}
      <div style="background:#fff;padding:32px;">
        <h2 style="margin:0 0 8px;color:#1a2e0a;font-size:20px;">Great news, ${donorName}! 🎉</h2>
        <p style="color:#555;line-height:1.6;">Your donation of <strong style="color:#5c7a3e;">${foodType}</strong> has been accepted by <strong>${ngoName || 'an NGO partner'}</strong>.</p>
        <div style="background:#f0f7e8;border-left:4px solid #5c7a3e;border-radius:8px;padding:16px;margin:20px 0;">
          <p style="margin:0;color:#3a5226;font-weight:600;">What happens next?</p>
          <ul style="margin:8px 0 0;padding-left:18px;color:#555;line-height:2;">
            <li>A volunteer will be assigned to pick up your donation</li>
            <li>You'll receive a <strong>Pickup OTP</strong> to verify the handover</li>
            <li>We'll notify you when it's been delivered</li>
          </ul>
        </div>
        <a href="${BASE_URL}/dashboard" style="display:inline-block;background:#5c7a3e;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;margin-top:4px;">View Donation Status →</a>
      </div>
      ${brandFooter}
    </div>
  `,
  text: `Hi ${donorName}, your donation of ${foodType} has been accepted by ${ngoName || 'an NGO'}. A volunteer will be assigned soon.`,
});

/**
 * Volunteer assigned → notify donor & volunteer
 */
const volunteerAssigned = ({ recipientName, foodType, volunteerName, role }) => ({
  subject: `🚗 ${role === 'volunteer' ? 'New delivery task assigned!' : 'A volunteer has been assigned to your donation!'} — ShareBite`,
  html: `
    <div style="max-width:560px;margin:0 auto;font-family:'Segoe UI',sans-serif;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
      ${brandHeader}
      <div style="background:#fff;padding:32px;">
        ${role === 'volunteer' ? `
          <h2 style="margin:0 0 8px;color:#1a2e0a;font-size:20px;">New Task Assigned, ${recipientName}! 🚗</h2>
          <p style="color:#555;line-height:1.6;">You have been assigned to pick up and deliver <strong style="color:#5c7a3e;">${foodType}</strong>. Please check your dashboard for pickup location and OTP details.</p>
        ` : `
          <h2 style="margin:0 0 8px;color:#1a2e0a;font-size:20px;">Volunteer Assigned, ${recipientName}! 🙌</h2>
          <p style="color:#555;line-height:1.6;"><strong>${volunteerName}</strong> has been assigned to pick up your <strong style="color:#5c7a3e;">${foodType}</strong> donation. Please be ready to share your Pickup OTP when they arrive.</p>
        `}
        <a href="${BASE_URL}/dashboard" style="display:inline-block;background:#5c7a3e;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;margin-top:12px;">View Details →</a>
      </div>
      ${brandFooter}
    </div>
  `,
  text: role === 'volunteer'
    ? `Hi ${recipientName}, you've been assigned to deliver ${foodType}. Check your dashboard for details.`
    : `Hi ${recipientName}, ${volunteerName} has been assigned to your ${foodType} donation.`,
});

/**
 * Donation picked up → notify donor
 */
const donationPickedUp = ({ donorName, foodType, volunteerName }) => ({
  subject: '📦 Your donation has been picked up! — ShareBite',
  html: `
    <div style="max-width:560px;margin:0 auto;font-family:'Segoe UI',sans-serif;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
      ${brandHeader}
      <div style="background:#fff;padding:32px;">
        <h2 style="margin:0 0 8px;color:#1a2e0a;font-size:20px;">It's on its way, ${donorName}! 📦</h2>
        <p style="color:#555;line-height:1.6;"><strong>${volunteerName || 'A volunteer'}</strong> has picked up your <strong style="color:#5c7a3e;">${foodType}</strong> donation and is now transporting it to the NGO.</p>
        <div style="background:#f5f0ff;border-left:4px solid #7c5cbf;border-radius:8px;padding:16px;margin:20px 0;">
          <p style="margin:0;color:#4a3780;font-weight:600;">🚗 In Transit</p>
          <p style="margin:6px 0 0;color:#555;">Your food is on its way to people who need it most. Thank you for making a difference!</p>
        </div>
        <a href="${BASE_URL}/dashboard" style="display:inline-block;background:#5c7a3e;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;">Track Status →</a>
      </div>
      ${brandFooter}
    </div>
  `,
  text: `Hi ${donorName}, your ${foodType} donation has been picked up by ${volunteerName || 'a volunteer'} and is on its way!`,
});

/**
 * Donation delivered → notify donor
 */
const donationDelivered = ({ donorName, foodType, ngoName }) => ({
  subject: '🎉 Donation delivered successfully! — ShareBite',
  html: `
    <div style="max-width:560px;margin:0 auto;font-family:'Segoe UI',sans-serif;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
      ${brandHeader}
      <div style="background:#fff;padding:32px;">
        <h2 style="margin:0 0 8px;color:#1a2e0a;font-size:20px;">Mission Accomplished, ${donorName}! 🎉</h2>
        <p style="color:#555;line-height:1.6;">Your donation of <strong style="color:#5c7a3e;">${foodType}</strong> has been successfully delivered to <strong>${ngoName || 'the NGO'}</strong>.</p>
        <div style="background:#f0fdf4;border-left:4px solid #22c55e;border-radius:8px;padding:16px;margin:20px 0;">
          <p style="margin:0;color:#166534;font-weight:600;">✅ Delivered!</p>
          <p style="margin:6px 0 0;color:#555;">Your generosity has helped reduce food waste and feed those in need. Thank you for being a ShareBite hero!</p>
        </div>
        <a href="${BASE_URL}/dashboard" style="display:inline-block;background:#5c7a3e;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;">Donate Again →</a>
      </div>
      ${brandFooter}
    </div>
  `,
  text: `Hi ${donorName}, your ${foodType} donation has been delivered to ${ngoName || 'the NGO'}. Thank you!`,
});

module.exports = {
  donationAccepted,
  volunteerAssigned,
  donationPickedUp,
  donationDelivered,
};

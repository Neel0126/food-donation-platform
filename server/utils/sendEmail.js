const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  if (process.env.SKIP_EMAIL === 'true') {
    console.log('[Email] SKIP_EMAIL=true — email not sent (mock mode).');
    return { messageId: 'mock-id-skip-email' };
  }

  const senderEmail = process.env.FROM_EMAIL || process.env.SMTP_EMAIL || process.env.GMAIL_USER || 'noreply@sharebite.dev';
  const senderName = process.env.FROM_NAME || 'ShareBite';

  // 1. Resend HTTPS API (Recommended for Render Free tier — uses HTTPS, bypasses all blocked SMTP ports)
  if (process.env.RESEND_API_KEY) {
    console.log('[Email] Using Resend HTTPS API for:', options.email);
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `${senderName} <${process.env.RESEND_FROM || 'onboarding@resend.dev'}>`,
        to: options.email,
        subject: options.subject,
        html: options.html,
        text: options.message
      })
    });

    const data = await res.json();
    if (!res.ok) {
      console.error('[Email] Resend API error:', data);
      throw new Error(data.message || 'Failed to send email via Resend');
    }
    console.log(`[Email] Successfully sent via Resend to ${options.email} — ID: ${data.id}`);
    return { messageId: data.id };
  }

  let transporter;

  // 2. Gmail App Password (preferred when GMAIL_PASS is configured)
  if (process.env.GMAIL_USER && (process.env.GMAIL_PASS || process.env.SMTP_PASSWORD)) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: (process.env.GMAIL_PASS || process.env.SMTP_PASSWORD).replace(/\s+/g, ''),
      },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 8000,
    });
    console.log('[Email] Using Gmail App Password transport for:', process.env.GMAIL_USER);
  } else if (
    process.env.GMAIL_CLIENT_ID &&
    process.env.GMAIL_CLIENT_SECRET &&
    process.env.GMAIL_REFRESH_TOKEN &&
    process.env.GMAIL_USER
  ) {
    // 3. Gmail OAuth2
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: process.env.GMAIL_USER,
        clientId: process.env.GMAIL_CLIENT_ID,
        clientSecret: process.env.GMAIL_CLIENT_SECRET,
        refreshToken: process.env.GMAIL_REFRESH_TOKEN,
      },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 8000,
    });
    console.log('[Email] Using Gmail OAuth2 transport for:', process.env.GMAIL_USER);
  } else if (process.env.SMTP_HOST) {
    // 4. Custom SMTP Relay (SendGrid, Brevo, Mailgun, etc.)
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const isSecure = port === 465;

    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: isSecure,
      requireTLS: !isSecure,
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD,
      },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 8000,
    });
    console.log('[Email] Using SMTP relay transport:', process.env.SMTP_HOST);
  } else {
    const errorMsg = 'No email transport configured. Set RESEND_API_KEY or GMAIL credentials in environment.';
    console.error(`[Email] ${errorMsg}`);
    throw new Error(errorMsg);
  }
  const senderName = process.env.FROM_NAME || 'ShareBite';

  const message = {
    from: `"${senderName}" <${senderEmail}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html,
  };

  try {
    const info = await transporter.sendMail(message);
    console.log(`[Email] Successfully sent to ${options.email} — MessageID: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('[Email] Failed to send email:', {
      to: options.email,
      subject: options.subject,
      error: error.message,
      code: error.code,
    });

    if (process.env.NODE_ENV === 'development') {
      console.log('--- DEVELOPMENT MODE EMAIL FALLBACK ---');
      console.log('To:', options.email);
      console.log('Subject:', options.subject);
      console.log('Message:', options.message);
      console.log('-----------------------------------------');
    }
    // Always rethrow so controllers know the email failed and don't report false success
    throw error;
  }
};

module.exports = sendEmail;

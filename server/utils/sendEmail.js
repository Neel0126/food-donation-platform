const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // Create a transporter using SMTP credentials from .env
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  // Verify connection configuration (optional, helps with debugging)
  // transporter.verify(function(error, success) {
  //   if (error) {
  //     console.log("SMTP Error:", error);
  //   }
  // });

  const message = {
    from: `${process.env.FROM_NAME || 'ShareBite'} <${process.env.FROM_EMAIL || process.env.SMTP_EMAIL}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html, // Optional HTML version
  };

  try {
    const info = await transporter.sendMail(message);
    console.log('Message sent: %s', info.messageId);
  } catch (error) {
    console.error('Failed to send email:', error);
    // If we're in dev and SMTP is failing/missing, just log it so the dev isn't blocked
    if (process.env.NODE_ENV === 'development') {
      console.log('--- DEVELOPMENT MODE EMAIL FALLBACK ---');
      console.log('To:', options.email);
      console.log('Subject:', options.subject);
      console.log('Message:', options.message);
      console.log('-----------------------------------------');
    } else {
      throw error; // Rethrow in production
    }
  }
};

module.exports = sendEmail;

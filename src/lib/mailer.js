const nodemailer = require('nodemailer');
const config = require('../config');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (!config.smtpHost || !config.smtpUser) {
    // Return a preview/console transport when SMTP is not configured
    transporter = {
      sendMail: async (opts) => {
        console.log('[Mailer] Email (no SMTP configured):');
        console.log('  To:', opts.to);
        console.log('  Subject:', opts.subject);
        return { messageId: 'dev-preview' };
      },
    };
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpPort === 465,
    auth: {
      user: config.smtpUser,
      pass: config.smtpPass,
    },
  });

  return transporter;
}

module.exports = {
  sendMail: (opts) => getTransporter().sendMail(opts),
};

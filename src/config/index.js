require('dotenv').config();

const required = ['JWT_SECRET', 'ADMIN_API_KEY'];
for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

module.exports = Object.freeze({
  port: parseInt(process.env.PORT) || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',

  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  adminApiKey: process.env.ADMIN_API_KEY,

  smtpHost: process.env.SMTP_HOST,
  smtpPort: parseInt(process.env.SMTP_PORT) || 587,
  smtpUser: process.env.SMTP_USER,
  smtpPass: process.env.SMTP_PASS,
  smtpFrom: process.env.SMTP_FROM || 'KIBI Sports <noreply@kibi.com>',
  notifyEmail: process.env.NOTIFY_EMAIL,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  slackWebhookUrl: process.env.SLACK_WEBHOOK_URL || null,

  googleSheetsId: process.env.GOOGLE_SHEETS_ID || null,
  googleServiceAccountJson: process.env.GOOGLE_SERVICE_ACCOUNT_JSON || null,

  excelCrmPath: process.env.EXCEL_CRM_PATH || null,
});

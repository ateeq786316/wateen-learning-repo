const path = require('path');

module.exports = {
  cli: {
    usage: 'Usage: node src/cli/index.js <input.csv> <output.csv>',
  },
  csv: {
    batchSize: 1000,
    allowedExt: '.csv',
  },
  upload: {
    dir: path.join(__dirname, '../../uploads'),
    maxSize: 10 * 1024 * 1024,
    allowedExt: ['.xlsx', '.xls', '.csv'],
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-in-production',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-production',
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },
  oauth: {
    google: {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    github: {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: process.env.GITHUB_CALLBACK_URL,
    },
  },
  email: {
    smtpHost: process.env.SMTP_HOST,
    smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
    smtpUser: process.env.SMTP_USER,
    smtpPass: process.env.SMTP_PASS,
    fromAddress: process.env.FROM_EMAIL || 'noreply@example.com',
  },
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
};

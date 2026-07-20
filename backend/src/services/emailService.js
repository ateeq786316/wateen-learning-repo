const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

let transporter = null;
let initialized = false;

function getTransporter() {
  if (initialized) return transporter;
  initialized = true;

  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();

  if (host && user) {
    transporter = nodemailer.createTransport({
      host,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_PORT === '465',
      auth: { user, pass: process.env.SMTP_PASS },
    });
    logger.info('Email transporter configured');
  } else {
    logger.info('SMTP not configured — emails logged to console');
    transporter = null;
  }

  return transporter;
}

function getFromAddress() {
  return process.env.FROM_EMAIL || 'noreply@example.com';
}

function getFrontendUrl() {
  return process.env.FRONTEND_URL || 'http://localhost:5173';
}

async function sendVerificationEmail(user, token) {
  const link = `${getFrontendUrl()}/verify-email/${token}`;
  const subject = 'Verify your email address';

  if (!getTransporter()) {
    logger.info(`[EMAIL] To: ${user.email} | Subject: ${subject} | Link: ${link}`);
    return;
  }

  try {
    await transporter.sendMail({
      from: getFromAddress(),
      to: user.email,
      subject,
      html: `<h1>Email Verification</h1><p>Click the link to verify: <a href="${link}">${link}</a></p><p>This link expires in 24 hours.</p>`,
    });
    logger.info(`Verification email sent to ${user.email}`);
  } catch (err) {
    logger.error(`Failed to send verification email to ${user.email}`, { error: err.message });
  }
}

async function sendPasswordResetEmail(user, token) {
  const link = `${getFrontendUrl()}/reset-password/${token}`;
  const subject = 'Reset your password';

  if (!getTransporter()) {
    logger.info(`[EMAIL] To: ${user.email} | Subject: ${subject} | Link: ${link}`);
    return;
  }

  try {
    await transporter.sendMail({
      from: getFromAddress(),
      to: user.email,
      subject,
      html: `<h1>Password Reset</h1><p>Click the link to reset your password: <a href="${link}">${link}</a></p><p>This link expires in 1 hour.</p><p>If you didn't request this, ignore this email.</p>`,
    });
    logger.info(`Password reset email sent to ${user.email}`);
  } catch (err) {
    logger.error(`Failed to send password reset email to ${user.email}`, { error: err.message });
  }
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail };

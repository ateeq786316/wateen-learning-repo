const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const accessSecret = () => process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-in-production';
const refreshSecret = () => process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-production';

function generateAccessToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role, type: 'access' },
    accessSecret(),
    { expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m' }
  );
}

function generateRefreshToken(user) {
  const jti = crypto.randomUUID();
  const token = jwt.sign(
    { sub: user.id, type: 'refresh', jti },
    refreshSecret(),
    { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
  );
  return { token, jti };
}

function verifyAccessToken(token) {
  return jwt.verify(token, accessSecret());
}

function verifyRefreshToken(token) {
  return jwt.verify(token, refreshSecret());
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateRandomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashToken,
  generateRandomToken,
};

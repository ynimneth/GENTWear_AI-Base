const jwt = require('jsonwebtoken');

const getJwtSecret = () => process.env.JWT_SECRET || 'fallback_secret_for_dev_only';
const getJwtRefreshSecret = () => process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret_for_dev_only';

// Short-lived access token — sent in response body
exports.generateAccessToken = (user) => {
  return jwt.sign(
    { userId: user.id, role: user.role },
    getJwtSecret(),
    { expiresIn: '15m' }
  );
};

// Long-lived refresh token — stored in HttpOnly cookie
exports.generateRefreshToken = (user) => {
  return jwt.sign(
    { userId: user.id },
    getJwtRefreshSecret(),
    { expiresIn: '7d' }
  );
};

exports.verifyAccessToken  = (token) => jwt.verify(token, getJwtSecret());
exports.verifyRefreshToken = (token) => jwt.verify(token, getJwtRefreshSecret());

// Email verification token (from register step)
exports.generateVerifyToken = (userId) => {
  return jwt.sign({ userId, purpose: 'email-verify' }, getJwtSecret(), { expiresIn: '24h' });
};

exports.verifyEmailToken = (token) => {
  return jwt.verify(token, getJwtSecret()); // throws if invalid/expired
};

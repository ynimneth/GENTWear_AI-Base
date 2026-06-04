const jwt = require('jsonwebtoken');

const getJwtSecret = () => process.env.JWT_SECRET || 'fallback_secret_for_dev_only';

// Short-lived token just for email verification
exports.generateVerifyToken = (userId) => {
  return jwt.sign({ userId, purpose: 'email-verify' }, getJwtSecret(), { expiresIn: '24h' });
};

exports.verifyEmailToken = (token) => {
  return jwt.verify(token, getJwtSecret()); // throws if invalid/expired
};

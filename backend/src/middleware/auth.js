const { verifyAccessToken } = require('../utils/token');
const { User } = require('../config/db');

module.exports = async (req, res, next) => {
  // 1. Extract token from Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // 2. Verify & decode
    const decoded = verifyAccessToken(token);

    // 3. Fetch fresh user from DB (catches deleted/banned accounts)
    const user = await User.findByPk(decoded.userId, {
      attributes: ['id', 'email', 'full_name', 'role', 'is_verified', 'is_blocked']
    });

    if (!user) {
      return res.status(401).json({ message: 'User no longer exists' });
    }

    if (user.is_blocked) {
      return res.status(403).json({ message: 'Your account has been suspended' });
    }

    // 4. Attach to request
    req.user = user;
    next();

  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ message: 'Invalid token' });
  }
};

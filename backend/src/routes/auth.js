const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const { User } = require('../config/db');
const { sendVerificationEmail } = require('../services/emailService');
const { generateVerifyToken, verifyEmailToken } = require('../utils/token');

// Validation rules for registration
const registerValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('full_name').trim().notEmpty().withMessage('Full name is required'),
  body('role').optional().isIn(['admin', 'user', 'moderator']).withMessage('Invalid role')
];

// POST /auth/register
router.post('/register', registerValidation, async (req, res) => {
  // 1. Check validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password, full_name, role } = req.body;

  try {
    // 2. Check if email already exists
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    // 3. Hash the password
    const password_hash = await bcrypt.hash(password, 12);

    // 4. Create user (is_verified defaults to false)
    const user = await User.create({
      email,
      password_hash,
      full_name,
      role: role || 'user',
      is_verified: false
    });

    // 5. Generate verification token & send email
    const token = generateVerifyToken(user.id);
    await sendVerificationEmail(user.email, user.full_name, token);

    return res.status(201).json({
      message: 'Registration successful. Please check your email to verify your account.'
    });

  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /auth/verify-email
router.get('/verify-email', async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ message: 'Verification token is required' });
  }

  try {
    // 1. Verify token validity/expiry
    const decoded = verifyEmailToken(token);
    
    if (decoded.purpose !== 'email-verify') {
      return res.status(400).json({ message: 'Invalid token purpose' });
    }

    // 2. Find matching user
    const user = await User.findByPk(decoded.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // 3. Update status if not already verified
    if (user.is_verified) {
      return res.status(200).json({ message: 'Email is already verified.' });
    }

    user.is_verified = true;
    await user.save();

    return res.status(200).json({ message: 'Email verified successfully!' });

  } catch (err) {
    console.error('Verify email error:', err);
    return res.status(400).json({ message: 'Invalid or expired verification token' });
  }
});

module.exports = router;

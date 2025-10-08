const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { prisma } = require('../config/prisma');
const env = require('../config/env');
const { ok, created, badRequest, unauthorized, serverError } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');
const auth = require('../middleware/auth');

const router = express.Router();

// Generate JWT Token
const generateToken = (userId) => {
  const secret = env.jwtSecret || 'fallback-secret-change-in-production';
  const expiresIn = env.jwtExpiresIn || '7d';
  
  return jwt.sign({ userId }, secret, {
    expiresIn,
  });
};

// @route   POST /api/auth/signup
// @desc    Register user
// @access  Public
router.post('/signup', asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;

    // Validation
    if (!name || !email || !password) {
      return badRequest(res, 'All fields are required');
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return badRequest(res, 'Invalid email format');
    }

    if (password.length < 6) {
      return badRequest(res, 'Password must be at least 6 characters');
    }

    if (name.trim().length < 2) {
      return badRequest(res, 'Name must be at least 2 characters');
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return badRequest(res, 'User already exists');
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const insertedUser = await prisma.user.create({ data: { name, email, password: hashedPassword } });

    // Generate token
    const token = generateToken(insertedUser.id);

    return created(res, {
      message: 'User created successfully',
      token,
      user: { id: insertedUser.id, name, email },
    });
  }))

// @route   POST /api/auth/login
// @desc    Authenticate user
// @access  Public
router.post('/login', asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return badRequest(res, 'Email and password are required');
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return badRequest(res, 'Invalid email format');
    }

    // Check if user exists
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return badRequest(res, 'Invalid credentials');
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return badRequest(res, 'Invalid credentials');
    }

    // Generate token
    const token = generateToken(user.id);

    // Record login log with IP
    const ip = (req.headers['x-forwarded-for']?.toString().split(',')[0] || req.socket.remoteAddress || '').trim();
    await prisma.loginLog.create({ data: { userId: BigInt(user.id), action: 'login', ipAddress: ip } });

    return ok(res, {
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  }))

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', auth, (req, res) => ok(res, { user: req.user }));

// @route   POST /api/auth/logout
// @desc    Logout and record ip
// @access  Private
router.post('/logout', auth, asyncHandler(async (req, res) => {
  const ip = (req.headers['x-forwarded-for']?.toString().split(',')[0] || req.socket.remoteAddress || '').trim();
  await prisma.loginLog.create({ data: { userId: BigInt(req.user.id), action: 'logout', ipAddress: ip } });
  return ok(res, { message: 'Logged out' });
}));

module.exports = router;
// @route   POST /api/auth/forgot-password
// @desc    Send password reset email
// @access  Public
router.post('/forgot-password', async (req, res) => {
	try {
		const { email } = req.body;
		if (!email) return res.status(400).json({ message: 'Email is required' });

		const user = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true, email: true } });

		// Always respond success to avoid email enumeration
		if (!user) {
			return res.json({ message: 'If the email exists, a reset link was sent' });
		}

		const secret = process.env.JWT_SECRET || 'fallback-secret-change-in-production';
		const token = jwt.sign({ userId: user.id }, secret, { expiresIn: '15m' });

		const resetUrlBase = process.env.FRONTEND_URL || 'http://localhost:5173';
		const resetLink = `${resetUrlBase}/reset-password?token=${token}`;

		try {
			const { sendMail } = require('../utils/mailer');
			await sendMail({
				to: user.email,
				subject: 'Reset your password',
				html: `<p>Hello ${user.name || ''},</p><p>Click the link below to reset your password. This link expires in 15 minutes.</p><p><a href="${resetLink}">${resetLink}</a></p>`,
				text: `Reset your password: ${resetLink}`,
			});
		} catch (mailErr) {
			console.error('Email send error:', mailErr);
			// Still return success to not leak user existence
		}

		return res.json({ message: 'If the email exists, a reset link was sent' });
	} catch (err) {
		console.error('Forgot password error:', err);
		res.status(500).json({ message: 'Server error' });
	}
});

// @route   POST /api/auth/reset-password
// @desc    Reset password using token
// @access  Public
router.post('/reset-password', async (req, res) => {
	try {
		const { token, password } = req.body;
		if (!token || !password) return res.status(400).json({ message: 'Token and password are required' });
		if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });

		const secret = process.env.JWT_SECRET || 'fallback-secret-change-in-production';
		let payload;
		try {
			payload = jwt.verify(token, secret);
		} catch (e) {
			return res.status(400).json({ message: 'Invalid or expired token' });
		}

		const salt = await bcrypt.genSalt(10);
		const hashedPassword = await bcrypt.hash(password, salt);

		await prisma.user.update({ where: { id: BigInt(payload.userId) }, data: { password: hashedPassword } });

		return res.json({ message: 'Password updated successfully' });
	} catch (err) {
		console.error('Reset password error:', err);
		res.status(500).json({ message: 'Server error' });
	}
});

module.exports = router;

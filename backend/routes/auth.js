const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { prisma } = require('../config/prisma');
const env = require('../config/env');
const { ok, created, badRequest, unauthorized, serverError } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');
const auth = require('../middleware/auth');

// Helper function to handle Prisma connection issues
const handlePrismaError = (error, res) => {
  console.error('Prisma Error:', error);
  
  if (error.code === 'P2021') {
    return badRequest(res, 'Database table not found. Please contact support.');
  }
  
  if (error.code === 'P1001') {
    return serverError(res, 'Database connection failed. Please try again.');
  }
  
  if (error.message && error.message.includes('prepared statement')) {
    // Force Prisma client restart on prepared statement conflicts
    console.log('Prepared statement conflict detected, restarting connection...');
    return serverError(res, 'Database connection issue. Please try again.');
  }
  
  return serverError(res, 'Database error occurred.');
};

// Helper function to extract client IP address
const getClientIP = (req) => {
  // Check various headers that might contain the real IP
  const xForwardedFor = req.headers['x-forwarded-for'];
  const xRealIP = req.headers['x-real-ip'];
  const cfConnectingIP = req.headers['cf-connecting-ip'];
  const xClientIP = req.headers['x-client-ip'];
  const xClusterClientIP = req.headers['x-cluster-client-ip'];
  const xForwarded = req.headers['x-forwarded'];
  const forwardedFor = req.headers['forwarded-for'];
  const forwarded = req.headers['forwarded'];
  
  // Socket addresses
  const socketRemoteAddress = req.socket?.remoteAddress;
  const connectionRemoteAddress = req.connection?.remoteAddress;
  const connectionSocketRemoteAddress = req.connection?.socket?.remoteAddress;
  
  // Try to extract IP from various sources
  let ip = null;
  
  // Check X-Forwarded-For header (most common)
  if (xForwardedFor) {
    ip = xForwardedFor.toString().split(',')[0].trim();
  }
  // Check X-Real-IP header
  else if (xRealIP) {
    ip = xRealIP.toString().trim();
  }
  // Check Cloudflare header
  else if (cfConnectingIP) {
    ip = cfConnectingIP.toString().trim();
  }
  // Check other proxy headers
  else if (xClientIP) {
    ip = xClientIP.toString().trim();
  }
  else if (xClusterClientIP) {
    ip = xClusterClientIP.toString().trim();
  }
  else if (xForwarded) {
    ip = xForwarded.toString().trim();
  }
  else if (forwardedFor) {
    ip = forwardedFor.toString().trim();
  }
  else if (forwarded) {
    // Parse Forwarded header (RFC 7239)
    const forwardedMatch = forwarded.match(/for=([^;,\s]+)/);
    if (forwardedMatch) {
      ip = forwardedMatch[1].replace(/"/g, '').trim();
    }
  }
  // Fall back to socket addresses
  else if (socketRemoteAddress) {
    ip = socketRemoteAddress.toString().trim();
  }
  else if (connectionRemoteAddress) {
    ip = connectionRemoteAddress.toString().trim();
  }
  else if (connectionSocketRemoteAddress) {
    ip = connectionSocketRemoteAddress.toString().trim();
  }
  
  // Clean up IPv6-mapped IPv4 addresses
  if (ip && ip.startsWith('::ffff:')) {
    ip = ip.substring(7);
  }
  
  // Remove IPv6 brackets if present
  if (ip && ip.startsWith('[') && ip.includes(']')) {
    ip = ip.substring(1, ip.indexOf(']'));
  }
  
  // Default fallback
  if (!ip || ip === '' || ip === 'undefined' || ip === 'null') {
    ip = 'unknown';
  }
  
  // Log for debugging (can be removed in production)
  // console.log('IP Extraction Debug:', { extractedIP: ip });
  
  return ip;
};

const router = express.Router();

// Generate JWT Token
const generateToken = (userId) => {
  const secret = env.jwtSecret || 'fallback-secret-change-in-production';
  const expiresIn = env.jwtExpiresIn || '7d';
  
  // Convert BigInt to string for JWT
  const userIdString = typeof userId === 'bigint' ? userId.toString() : userId;
  
  return jwt.sign({ userId: userIdString }, secret, {
    expiresIn,
  });
};

// @route   POST /api/auth/signup
// @desc    Register user
// @access  Public
router.post('/signup', asyncHandler(async (req, res) => {
    try {
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

    // Generate verification token
    const verificationToken = jwt.sign({ email }, env.jwtSecret || 'fallback-secret', { expiresIn: '24h' });
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create user
    const insertedUser = await prisma.user.create({ 
      data: { 
        name, 
        email, 
        password: hashedPassword,
        verificationToken,
        verificationTokenExpires
      } 
    });

    // Send verification email
    try {
      const { sendMail } = require('../utils/mailer');
      const verificationUrl = `${env.frontendUrl}/verify-email?token=${verificationToken}`;
      
      await sendMail({
        to: email,
        subject: 'Verify Your Email - YouTube Clone',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to YouTube Clone!</h1>
            </div>
            
            <div style="padding: 30px; background: #f8f9fa;">
              <h2 style="color: #333; margin-top: 0;">Hi ${name}!</h2>
              
              <p style="color: #666; font-size: 16px; line-height: 1.6;">
                Thank you for signing up! To complete your registration and start using our platform, 
                please verify your email address by clicking the button below:
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${verificationUrl}" 
                   style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                          color: white; 
                          padding: 15px 30px; 
                          text-decoration: none; 
                          border-radius: 8px; 
                          font-weight: bold; 
                          display: inline-block;
                          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                  Verify Email Address
                </a>
              </div>
              
              <p style="color: #666; font-size: 14px; line-height: 1.6;">
                If the button doesn't work, you can also copy and paste this link into your browser:
              </p>
              
              <p style="color: #667eea; font-size: 14px; word-break: break-all; background: #f0f0f0; padding: 10px; border-radius: 4px;">
                ${verificationUrl}
              </p>
              
              <p style="color: #999; font-size: 12px; margin-top: 30px;">
                This verification link will expire in 24 hours. If you didn't create an account, 
                please ignore this email.
              </p>
            </div>
            
            <div style="background: #333; color: #999; padding: 20px; text-align: center; font-size: 12px;">
              <p style="margin: 0;">© 2024 YouTube Clone. All rights reserved.</p>
            </div>
          </div>
        `,
        text: `Welcome to YouTube Clone! Please verify your email by visiting: ${verificationUrl}`,
      });
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Don't fail signup if email fails, just log it
    }

    return created(res, {
        message: 'User created successfully. Please check your email to verify your account.',
        user: { id: insertedUser.id.toString(), name, email, isVerified: false },
    });
    } catch (error) {
      return handlePrismaError(error, res);
    }
  }))

// @route   POST /api/auth/login
// @desc    Authenticate user
// @access  Public
router.post('/login', asyncHandler(async (req, res) => {
    try {
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

      // Check if email is verified
      if (!user.isVerified) {
        return badRequest(res, 'Please verify your email before logging in. Check your email for verification link.');
      }

      // Check password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return badRequest(res, 'Invalid credentials');
      }

      // Generate token
      const token = generateToken(user.id);

      // Record login log with IP
      const ip = getClientIP(req);
      await prisma.loginLog.create({ data: { userId: BigInt(user.id), action: 'login', ipAddress: ip } });

      return ok(res, {
        message: 'Login successful',
        token,
        user: {
          id: user.id.toString(),
          name: user.name,
          email: user.email,
        },
      });
    } catch (error) {
      return handlePrismaError(error, res);
    }
  }))

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', auth, (req, res) => ok(res, { user: req.user }));

// @route   GET /api/auth/debug
// @desc    Debug endpoint for production issues (temporary)
// @access  Public
router.get('/debug', asyncHandler(async (req, res) => {
  try {
    // Test database connection
    const userCount = await prisma.user.count();
    const loginLogCount = await prisma.loginLog.count();
    
    return ok(res, {
      message: 'Debug info',
      database: {
        connected: true,
        userCount,
        loginLogCount
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasJwtSecret: !!process.env.JWT_SECRET,
        hasDatabaseUrl: !!process.env.DATABASE_URL
      }
    });
  } catch (error) {
    return serverError(res, `Database connection failed: ${error.message}`);
  }
}));

// @route   POST /api/auth/logout
// @desc    Logout and record ip
// @access  Private
router.post('/logout', auth, asyncHandler(async (req, res) => {
  const ip = getClientIP(req);
  await prisma.loginLog.create({ data: { userId: BigInt(req.user.id), action: 'logout', ipAddress: ip } });
  return ok(res, { message: 'Logged out' });
}));

// @route   POST /api/auth/forgot-password
// @desc    Send password reset email
// @access  Public
router.post('/forgot-password', asyncHandler(async (req, res) => {
	try {
		const { email } = req.body;
		if (!email) return badRequest(res, 'Email is required');

		const user = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true, email: true } });

		// Always respond success to avoid email enumeration
		if (!user) {
			return ok(res, { message: 'If the email exists, a reset link was sent' });
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

		return ok(res, { message: 'If the email exists, a reset link was sent' });
	} catch (err) {
		console.error('Forgot password error:', err);
		return serverError(res, 'Server error');
	}
}));

// @route   POST /api/auth/reset-password
// @desc    Reset password using token
// @access  Public
router.post('/reset-password', asyncHandler(async (req, res) => {
	try {
		const { token, password } = req.body;
		if (!token || !password) return badRequest(res, 'Token and password are required');
		if (password.length < 6) return badRequest(res, 'Password must be at least 6 characters');

		const secret = process.env.JWT_SECRET || 'fallback-secret-change-in-production';
		let payload;
		try {
			payload = jwt.verify(token, secret);
		} catch (e) {
			return badRequest(res, 'Invalid or expired token');
		}

		const salt = await bcrypt.genSalt(10);
		const hashedPassword = await bcrypt.hash(password, salt);

		await prisma.user.update({ where: { id: BigInt(payload.userId) }, data: { password: hashedPassword } });

		return ok(res, { message: 'Password updated successfully' });
	} catch (err) {
		console.error('Reset password error:', err);
		return serverError(res, 'Server error');
	}
}));

// @route   GET /api/auth/verify-email
// @desc    Verify user email with token
// @access  Public
router.get('/verify-email', asyncHandler(async (req, res) => {
  const { token } = req.query;
  
  if (!token) {
    return badRequest(res, 'Verification token is required');
  }

  try {
    // Verify the token
    const decoded = jwt.verify(token, env.jwtSecret || 'fallback-secret');
    
    // Find user by verification token
    const user = await prisma.user.findFirst({
      where: {
        verificationToken: token,
        verificationTokenExpires: {
          gt: new Date()
        }
      }
    });

    if (!user) {
      return badRequest(res, 'Invalid or expired verification token');
    }

    // Update user as verified and clear verification token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        verificationToken: null,
        verificationTokenExpires: null
      }
    });

    // Send welcome email
    try {
      const { sendMail } = require('../utils/mailer');
      await sendMail({
        to: user.email,
        subject: 'Welcome to YouTube Clone! 🎉',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Welcome to YouTube Clone!</h1>
            </div>
            
            <div style="padding: 30px; background: #f8f9fa;">
              <h2 style="color: #333; margin-top: 0;">Hi ${user.name}!</h2>
              
              <p style="color: #666; font-size: 16px; line-height: 1.6;">
                Your email has been successfully verified! You can now enjoy all the features of our platform.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${env.frontendUrl}/login" 
                   style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                          color: white; 
                          padding: 15px 30px; 
                          text-decoration: none; 
                          border-radius: 8px; 
                          font-weight: bold; 
                          display: inline-block;
                          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                  Go to Login
                </a>
              </div>
              
              <p style="color: #666; font-size: 14px; line-height: 1.6;">
                Thank you for joining us! We're excited to have you on board.
              </p>
            </div>
          </div>
        `,
        text: `Welcome to YouTube Clone! Your email has been verified. You can now login at ${env.frontendUrl}/login`
      });
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
    }

    return ok(res, {
      message: 'Email verified successfully! You can now login.',
      user: { id: user.id, name: user.name, email: user.email, isVerified: true }
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return badRequest(res, 'Verification token has expired. Please request a new one.');
    }
    return badRequest(res, 'Invalid verification token');
  }
}));

// @route   POST /api/auth/resend-verification
// @desc    Resend verification email
// @access  Public
router.post('/resend-verification', asyncHandler(async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return badRequest(res, 'Email is required');
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return ok(res, { message: 'If the email exists, a verification email has been sent.' });
  }

  if (user.isVerified) {
    return badRequest(res, 'Email is already verified');
  }

  // Generate new verification token
  const verificationToken = jwt.sign({ email }, env.jwtSecret || 'fallback-secret', { expiresIn: '24h' });
  const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

  // Update user with new token
  await prisma.user.update({
    where: { id: user.id },
    data: {
      verificationToken,
      verificationTokenExpires
    }
  });

  // Send verification email
  try {
    const { sendMail } = require('../utils/mailer');
    const verificationUrl = `${env.frontendUrl}/verify-email?token=${verificationToken}`;
    
    await sendMail({
      to: email,
      subject: 'Verify Your Email - YouTube Clone',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Verify Your Email</h1>
          </div>
          
          <div style="padding: 30px; background: #f8f9fa;">
            <h2 style="color: #333; margin-top: 0;">Hi ${user.name}!</h2>
            
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
              Please verify your email address by clicking the button below:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; 
                        padding: 15px 30px; 
                        text-decoration: none; 
                        border-radius: 8px; 
                        font-weight: bold; 
                        display: inline-block;
                        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                Verify Email Address
              </a>
            </div>
            
            <p style="color: #999; font-size: 12px; margin-top: 30px;">
              This verification link will expire in 24 hours.
            </p>
          </div>
        </div>
      `,
      text: `Please verify your email by visiting: ${verificationUrl}`
    });
  } catch (emailError) {
    console.error('Failed to send verification email:', emailError);
    return serverError(res, 'Failed to send verification email');
  }

  return ok(res, { message: 'Verification email sent successfully. Please check your email.' });
}));

module.exports = router;

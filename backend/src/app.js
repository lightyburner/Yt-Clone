const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const routes = require('./routes');
const notFound = require('./middleware/notFound');
const error = require('./middleware/error');
const { applyRateLimit } = require('./libs/security');

const app = express();

// Security and limits
app.use(helmet());
applyRateLimit(app);

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      // Production Vercel URLs - include all possible patterns
      'https://yt-clone-blond.vercel.app',
      'https://www.yt-clone-blond.vercel.app',
      // Development URLs
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
      // Custom frontend URL from environment
      process.env.FRONTEND_URL
    ].filter(Boolean);
    
    // Check for Vercel deployment patterns (more flexible matching)
    const isVercelDeployment = origin.includes('.vercel.app');
    const isAllowedOrigin = allowedOrigins.includes(origin);
    const isLocalhost = origin.startsWith('http://localhost:');
    
    if (isVercelDeployment || isAllowedOrigin || (isLocalhost && process.env.NODE_ENV !== 'production')) {
      console.log(`✅ CORS allowed origin: ${origin}`);
      return callback(null, true);
    } else {
      console.log(`🔒 CORS blocked origin: ${origin}`);
      console.log(`📋 Allowed origins: ${allowedOrigins.join(', ')}`);
      console.log(`🔧 Environment: ${process.env.NODE_ENV}`);
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'Pragma',
    'X-API-Key'
  ]
};

app.use(cors(corsOptions));

// Ensure CORS headers are always set, even on errors
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma, X-API-Key');
  next();
});

// Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Root and health
app.get('/', (req, res) => {
  res.json({ message: 'YT Clone API is running!', version: '1.0.0', status: 'healthy' });
});
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API routes
app.use('/api', routes);

// 404 and error handlers
app.use(notFound);
app.use(error);

// Add production error logging
if (process.env.NODE_ENV === 'production') {
  app.use((err, req, res, next) => {
    console.error('Production Error:', {
      error: err.message,
      stack: err.stack,
      url: req.url,
      method: req.method,
      timestamp: new Date().toISOString()
    });
    next(err);
  });
}

module.exports = app;



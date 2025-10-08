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
      // Production Vercel URLs
      'https://yt-clone-blond.vercel.app',
      'https://yt-clone-git-main-lighty7s-projects.vercel.app',
      'https://yt-clone-lighty7s-projects.vercel.app',
      // Development URLs
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
      // Custom frontend URL from environment
      process.env.FRONTEND_URL
    ].filter(Boolean);
    
    // Check for Vercel deployment patterns
    const isVercelDeployment = origin.includes('.vercel.app') && origin.includes('yt-clone');
    const isAllowedOrigin = allowedOrigins.includes(origin);
    
    if (isVercelDeployment || isAllowedOrigin) {
      console.log(`✅ CORS allowed origin: ${origin}`);
      return callback(null, true);
    } else {
      console.log(`🔒 CORS blocked origin: ${origin}`);
      console.log(`📋 Allowed origins: ${allowedOrigins.join(', ')}`);
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
    'Pragma'
  ]
};

app.use(cors(corsOptions));

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

module.exports = app;



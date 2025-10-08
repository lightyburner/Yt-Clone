const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const env = require('./config/env');

const { testConnection } = require('./config/database');
const createTables = require('./config/createTables');

// Environment validation
const requiredEnvVars = ['jwtSecret'];
const missingVars = requiredEnvVars.filter(varName => !env[varName]);

if (missingVars.length > 0 && env.nodeEnv !== 'development') {
  console.error('❌ Missing required environment variables:', missingVars.join(', '));
  console.log('💡 Please create a .env file with the required variables. See .env.example for reference.');
  process.exit(1);
}

// Defaults handled in env loader

const app = express();
const port = env.port;

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});

// Middleware
app.use(helmet());
app.use(limiter);
app.use(cors({
  origin: env.nodeEnv === 'production'
    ? ['https://yt-clone-blond.vercel.app', env.frontendUrl]
    : [env.frontendUrl, 'http://localhost:3000'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'YT Clone API is running!',
    version: '1.0.0',
    status: 'healthy',
  });
});

// Auth routes
app.use('/api/auth', require('./routes/auth'));
// Posts routes
app.use('/api/posts', require('./routes/posts'));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 404 handler
app.use( (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Initialize database and start server
const startServer = async () => {
  try {
    await testConnection();
    await createTables();
    
    app.listen(port, () => {
      console.log(`🚀 Server running on port ${port}`);
      console.log(`🌍 Environment: ${env.nodeEnv}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

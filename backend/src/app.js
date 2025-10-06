const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const routes = require('./routes');
const notFound = require('./middleware/notFound');
const error = require('./middleware/error');
const { applyRateLimit, buildCorsOrigin } = require('./libs/security');

const app = express();

// Security and limits
app.use(helmet());
applyRateLimit(app);
app.use(cors({ origin: buildCorsOrigin(), credentials: true }));

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



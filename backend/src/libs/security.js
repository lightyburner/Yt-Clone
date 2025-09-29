const rateLimit = require('express-rate-limit');
const env = require('../../config/env');

function applyRateLimit(app) {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again later.',
  });
  app.use(limiter);
}

function buildCorsOrigin() {
  if (env.nodeEnv === 'production') {
    return ['https://yt-clone-blond.vercel.app', env.frontendUrl].filter(Boolean);
  }
  return [env.frontendUrl, 'http://localhost:3000','http://192.168.30.5:5174'].filter(Boolean);
}

module.exports = { applyRateLimit, buildCorsOrigin };



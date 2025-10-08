module.exports = (err, req, res, next) => {
  // eslint-disable-next-line no-console
  console.error('❌ Error Details:', {
    message: err.message,
    stack: err.stack,
    code: err.code,
    name: err.name,
    url: req.url,
    method: req.method
  });

  // Handle Prisma errors
  if (err.code === 'P2021') {
    return res.status(400).json({ message: 'Database table not found. Please contact support.' });
  }
  
  if (err.code === 'P1001') {
    return res.status(500).json({ message: 'Database connection failed. Please try again.' });
  }
  
  if (err.message && err.message.includes('prepared statement')) {
    console.log('Prepared statement conflict detected, restarting connection...');
    return res.status(500).json({ message: 'Database connection issue. Please try again.' });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ message: 'Invalid token' });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ message: 'Token expired' });
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: err.message });
  }

  // Default error response
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Something went wrong!';
  
  res.status(statusCode).json({ 
    message,
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      details: err 
    })
  });
};



module.exports = (err, req, res, next) => {
  // eslint-disable-next-line no-console
  console.error(err && err.stack ? err.stack : err);
  res.status(500).json({ message: 'Something went wrong!' });
};



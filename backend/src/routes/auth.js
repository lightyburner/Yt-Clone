const express = require('express');
const router = express.Router();

// Placeholder auth routes
router.get('/me', (req, res) => {
  res.json({ message: 'Auth route placeholder' });
});

router.post('/login', (req, res) => {
  res.json({ message: 'Login route placeholder' });
});

router.post('/signup', (req, res) => {
  res.json({ message: 'Signup route placeholder' });
});

module.exports = router;

const env = require('../config/env');

const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Missing Authorization header' });
  }

  // Mock implementation for now. In a real app, verify the JWT here.
  const token = authHeader.replace('Bearer ', '');
  if (token) {
    // Mock user object
    req.user = { id: 1, name: 'Mock User' };
    next();
  } else {
    res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = requireAuth;

const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  // Login disabled as per user request
  req.user = { id: 1, username: 'admin', role: 'ADMIN' };
  next();
};

const adminMiddleware = (req, res, next) => {
  if (req.user && req.user.role === 'ADMIN') {
    next();
  } else {
    res.status(403).json({ message: 'Forbidden: Admin access required' });
  }
};

module.exports = {
  authMiddleware,
  adminMiddleware
};

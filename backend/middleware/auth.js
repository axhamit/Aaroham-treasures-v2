const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verifies the JWT sent as "Authorization: Bearer <token>" and loads the user
exports.protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) return res.status(401).json({ message: 'Please log in' });
    const decoded = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ message: 'Account no longer exists' });
    if (user.isBlocked) return res.status(403).json({ message: 'This account has been blocked' });
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Session expired, please log in again' });
  }
};

exports.adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') return next();
  res.status(403).json({ message: 'Admin access only' });
};

exports.courierOnly = (req, res, next) => {
  if (req.user && req.user.role === 'courier') return next();
  res.status(403).json({ message: 'Courier access only' });
};

exports.adminOrCourier = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'courier')) return next();
  res.status(403).json({ message: 'Admin or courier access only' });
};

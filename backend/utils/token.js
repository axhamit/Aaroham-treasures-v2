const jwt = require('jsonwebtoken');

exports.signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES || '7d',
  });

exports.publicUser = (u) => ({
  id: u._id,
  name: u.name,
  email: u.email,
  avatar: u.avatar,
  phone: u.phone,
  role: u.role,
  createdAt: u.createdAt,
});

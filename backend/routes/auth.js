const router = require('express').Router();
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { signToken, publicUser } = require('../utils/token');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Email + password signup
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !emailRe.test(email || '')) return res.status(400).json({ message: 'Enter your name and a valid email' });
    if (!password || password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' });
    if (await User.findOne({ email: email.toLowerCase() })) return res.status(409).json({ message: 'An account with this email already exists' });
    const user = await User.create({ name, email, password }); // password is hashed with bcrypt in the model
    res.status(201).json({ token: signToken(user), user: publicUser(user) });
  } catch (e) { next(e); }
});

// Email + password login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: (email || '').toLowerCase() }).select('+password');
    if (!user) return res.status(401).json({ message: 'Incorrect email or password' });
    if (!user.password) return res.status(400).json({ message: 'This account uses Google sign-in. Continue with Google instead.' });
    if (!(await user.matchPassword(password || ''))) return res.status(401).json({ message: 'Incorrect email or password' });
    if (user.isBlocked) return res.status(403).json({ message: 'This account has been blocked' });
    res.json({ token: signToken(user), user: publicUser(user) });
  } catch (e) { next(e); }
});

// Google sign-in / signup. The frontend sends the Google ID token ("credential"),
// we verify it with Google, then create or link the user.
router.post('/google', async (req, res, next) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ message: 'Missing Google credential' });
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID });
    const p = ticket.getPayload();
    if (!p.email_verified) return res.status(400).json({ message: 'Google email is not verified' });

    let user = await User.findOne({ $or: [{ googleId: p.sub }, { email: p.email.toLowerCase() }] });
    if (!user) {
      user = await User.create({ name: p.name, email: p.email, googleId: p.sub, avatar: p.picture });
    } else {
      if (!user.googleId) user.googleId = p.sub;
      if (!user.avatar) user.avatar = p.picture;
      await user.save();
    }
    if (user.isBlocked) return res.status(403).json({ message: 'This account has been blocked' });
    res.json({ token: signToken(user), user: publicUser(user) });
  } catch (e) {
    e.status = 401; e.message = 'Google sign-in failed';
    next(e);
  }
});

router.get('/me', protect, (req, res) => res.json({ user: publicUser(req.user) }));

module.exports = router;

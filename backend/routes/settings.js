const router = require('express').Router();
const Setting = require('../models/Setting');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/', async (req, res, next) => {
  try { res.json(await Setting.get()); } catch (e) { next(e); }
});

router.put('/', protect, adminOnly, async (req, res, next) => {
  try {
    const s = await Setting.get();
    const allowed = ['storeName', 'tagline', 'announcement', 'heroTitle', 'heroSubtitle', 'heroImage', 'primaryColor', 'accentColor', 'backgroundColor', 'freeShippingAbove', 'shippingFee'];
    allowed.forEach((k) => { if (req.body[k] !== undefined) s[k] = req.body[k]; });
    await s.save();
    res.json(s);
  } catch (e) { next(e); }
});

module.exports = router;

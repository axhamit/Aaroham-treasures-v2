// Everything that belongs to the logged-in customer: profile, addresses, cart, wishlist
const router = require('express').Router();
const User = require('../models/User');
const Product = require('../models/Product');
const { protect } = require('../middleware/auth');
const { publicUser } = require('../utils/token');

router.use(protect);

/* ---------- profile ---------- */
router.put('/', async (req, res, next) => {
  try {
    const { name, phone } = req.body;
    if (name) req.user.name = name;
    if (phone !== undefined) req.user.phone = phone;
    await req.user.save();
    res.json({ user: publicUser(req.user) });
  } catch (e) { next(e); }
});

router.put('/password', async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) return res.status(400).json({ message: 'New password must be at least 8 characters' });
    const user = await User.findById(req.user._id).select('+password');
    if (user.password && !(await user.matchPassword(currentPassword || ''))) return res.status(400).json({ message: 'Current password is incorrect' });
    user.password = newPassword;
    await user.save();
    res.json({ message: 'Password updated' });
  } catch (e) { next(e); }
});

/* ---------- addresses ---------- */
router.get('/addresses', (req, res) => res.json(req.user.addresses));

router.post('/addresses', async (req, res, next) => {
  try {
    const u = req.user;
    if (req.body.isDefault || u.addresses.length === 0) u.addresses.forEach((a) => (a.isDefault = false));
    u.addresses.push({ ...req.body, isDefault: req.body.isDefault || u.addresses.length === 0 });
    await u.save();
    res.status(201).json(u.addresses);
  } catch (e) { next(e); }
});

router.put('/addresses/:id', async (req, res, next) => {
  try {
    const a = req.user.addresses.id(req.params.id);
    if (!a) return res.status(404).json({ message: 'Address not found' });
    if (req.body.isDefault) req.user.addresses.forEach((x) => (x.isDefault = false));
    a.set(req.body);
    await req.user.save();
    res.json(req.user.addresses);
  } catch (e) { next(e); }
});

router.delete('/addresses/:id', async (req, res, next) => {
  try {
    req.user.addresses.pull(req.params.id);
    if (req.user.addresses.length && !req.user.addresses.some((a) => a.isDefault)) req.user.addresses[0].isDefault = true;
    await req.user.save();
    res.json(req.user.addresses);
  } catch (e) { next(e); }
});

/* ---------- cart ---------- */
const cartResponse = async (userId) => {
  const u = await User.findById(userId).populate('cart.product');
  // drop items whose product was deleted or hidden
  return u.cart.filter((i) => i.product && i.product.isActive).map((i) => ({ product: i.product, qty: i.qty }));
};

router.get('/cart', async (req, res, next) => {
  try { res.json(await cartResponse(req.user._id)); } catch (e) { next(e); }
});

router.post('/cart', async (req, res, next) => {
  try {
    const { productId, qty = 1 } = req.body;
    const p = await Product.findById(productId);
    if (!p || !p.isActive) return res.status(404).json({ message: 'Product not found' });
    if (p.stock < 1) return res.status(400).json({ message: 'This product is out of stock' });
    const line = req.user.cart.find((i) => i.product.toString() === productId);
    const wanted = Math.min((line ? line.qty : 0) + Number(qty), p.stock);
    if (line) line.qty = wanted; else req.user.cart.push({ product: productId, qty: wanted });
    await req.user.save();
    res.json(await cartResponse(req.user._id));
  } catch (e) { next(e); }
});

router.put('/cart/:productId', async (req, res, next) => {
  try {
    const line = req.user.cart.find((i) => i.product.toString() === req.params.productId);
    if (!line) return res.status(404).json({ message: 'Item not in cart' });
    const p = await Product.findById(req.params.productId);
    line.qty = Math.max(1, Math.min(Number(req.body.qty) || 1, p ? p.stock : 1));
    await req.user.save();
    res.json(await cartResponse(req.user._id));
  } catch (e) { next(e); }
});

router.delete('/cart/:productId', async (req, res, next) => {
  try {
    req.user.cart = req.user.cart.filter((i) => i.product.toString() !== req.params.productId);
    await req.user.save();
    res.json(await cartResponse(req.user._id));
  } catch (e) { next(e); }
});

/* ---------- wishlist ---------- */
router.get('/wishlist', async (req, res, next) => {
  try {
    const u = await User.findById(req.user._id).populate('wishlist');
    res.json(u.wishlist.filter((p) => p.isActive));
  } catch (e) { next(e); }
});

// toggles: adds if missing, removes if present
router.post('/wishlist/:productId', async (req, res, next) => {
  try {
    const id = req.params.productId;
    const has = req.user.wishlist.some((p) => p.toString() === id);
    if (has) req.user.wishlist.pull(id); else req.user.wishlist.push(id);
    await req.user.save();
    res.json({ ids: req.user.wishlist.map(String), added: !has });
  } catch (e) { next(e); }
});

router.get('/wishlist-ids', (req, res) => res.json(req.user.wishlist.map(String)));

module.exports = router;

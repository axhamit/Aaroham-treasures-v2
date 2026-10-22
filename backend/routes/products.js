const router = require('express').Router();
const Product = require('../models/Product');
const { protect, adminOnly } = require('../middleware/auth');

// Public: list with search / filter / sort / pagination
router.get('/', async (req, res, next) => {
  try {
    const { q, category, minPrice, maxPrice, sort = 'new', featured } = req.query;
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 12, 60);
    const filter = { isActive: true };
    if (q) filter.$or = ['name', 'brand', 'category'].map((f) => ({ [f]: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }));
    if (category) filter.category = category;
    if (featured === 'true') filter.featured = true;
    if (minPrice || maxPrice) filter.price = { ...(minPrice && { $gte: +minPrice }), ...(maxPrice && { $lte: +maxPrice }) };
    const sorts = { new: { createdAt: -1 }, price_asc: { price: 1 }, price_desc: { price: -1 } };
    const [items, total] = await Promise.all([
      Product.find(filter).sort(sorts[sort] || sorts.new).skip((page - 1) * limit).limit(limit),
      Product.countDocuments(filter),
    ]);
    res.json({ items, total, page, pages: Math.ceil(total / limit) });
  } catch (e) { next(e); }
});

router.get('/categories', async (req, res, next) => {
  try { res.json(await Product.distinct('category', { isActive: true })); } catch (e) { next(e); }
});

// Admin: list everything including hidden products
router.get('/admin/all', protect, adminOnly, async (req, res, next) => {
  try {
    const { q } = req.query;
    const filter = q ? { name: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') } : {};
    res.json(await Product.find(filter).sort({ createdAt: -1 }));
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const p = await Product.findById(req.params.id);
    if (!p || !p.isActive) return res.status(404).json({ message: 'Product not found' });
    res.json(p);
  } catch (e) { next(e); }
});

const pick = (b) => {
  const out = {};
  ['name', 'brand', 'description', 'category', 'price', 'mrp', 'stock', 'images', 'featured', 'isActive'].forEach((k) => {
    if (b[k] !== undefined) out[k] = b[k];
  });
  return out;
};

router.post('/', protect, adminOnly, async (req, res, next) => {
  try { res.status(201).json(await Product.create(pick(req.body))); } catch (e) { next(e); }
});

router.put('/:id', protect, adminOnly, async (req, res, next) => {
  try {
    const p = await Product.findByIdAndUpdate(req.params.id, pick(req.body), { new: true, runValidators: true });
    if (!p) return res.status(404).json({ message: 'Product not found' });
    res.json(p);
  } catch (e) { next(e); }
});

router.delete('/:id', protect, adminOnly, async (req, res, next) => {
  try {
    const p = await Product.findByIdAndDelete(req.params.id);
    if (!p) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Product deleted' });
  } catch (e) { next(e); }
});

module.exports = router;

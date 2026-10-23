const router = require('express').Router();
const ExcelJS = require('exceljs');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const upload = require('../middleware/upload');
const { protect, adminOnly } = require('../middleware/auth');
const { publicUser } = require('../utils/token');

router.use(protect, adminOnly);

/* ---------- dashboard ---------- */
router.get('/stats', async (req, res, next) => {
  try {
    const since = new Date(); since.setDate(since.getDate() - 13); since.setHours(0, 0, 0, 0);
    const [revenueAgg, orders, customers, products, pending, daily, recent, lowStock, byStatus] = await Promise.all([
      Order.aggregate([{ $match: { paymentStatus: 'Paid', status: { $ne: 'Cancelled' } } }, { $group: { _id: null, total: { $sum: '$totalPrice' } } }]),
      Order.countDocuments(),
      User.countDocuments({ role: 'customer' }),
      Product.countDocuments(),
      Order.countDocuments({ status: { $in: ['Placed', 'Confirmed'] } }),
      Order.aggregate([
        { $match: { createdAt: { $gte: since }, status: { $ne: 'Cancelled' } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, revenue: { $sum: '$totalPrice' }, orders: { $sum: 1 } } },
      ]),
      Order.find().sort({ createdAt: -1 }).limit(6).populate('user', 'name email'),
      Product.find({ stock: { $lte: 3 } }).sort({ stock: 1 }).limit(6),
      Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);
    // fill missing days with zero
    const map = Object.fromEntries(daily.map((d) => [d._id, d]));
    const series = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(since); d.setDate(since.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      series.push({ date: key, revenue: map[key]?.revenue || 0, orders: map[key]?.orders || 0 });
    }
    res.json({ revenue: revenueAgg[0]?.total || 0, orders, customers, products, pending, series, recent, lowStock, byStatus });
  } catch (e) { next(e); }
});

/* ---------- orders ---------- */
async function buildOrderFilter(q) {
  const filter = {};
  if (q.status) filter.status = q.status;
  if (q.payment) filter.paymentMethod = q.payment;
  if (q.from || q.to) {
    filter.createdAt = {};
    if (q.from) filter.createdAt.$gte = new Date(q.from);
    if (q.to) { const t = new Date(q.to); t.setHours(23, 59, 59, 999); filter.createdAt.$lte = t; }
  }
  if (q.q) {
    const re = new RegExp(q.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const ids = await User.find({ $or: [{ name: re }, { email: re }] }).distinct('_id');
    filter.$or = [{ orderNumber: re }, { user: { $in: ids } }];
  }
  return filter;
}

router.get('/orders', async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = 15;
    const filter = await buildOrderFilter(req.query);
    const [items, total] = await Promise.all([
      Order.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate('user', 'name email phone'),
      Order.countDocuments(filter),
    ]);
    res.json({ items, total, page, pages: Math.ceil(total / limit) });
  } catch (e) { next(e); }
});

// Export the order summary as Excel (.xlsx) or CSV. Accepts the same filters as the list.
router.get('/orders/export', async (req, res, next) => {
  try {
    const filter = await buildOrderFilter(req.query);
    const orders = await Order.find(filter).sort({ createdAt: -1 }).populate('user', 'name email phone');
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Orders');
    ws.columns = [
      { header: 'Order no.', key: 'no', width: 18 }, { header: 'Date', key: 'date', width: 20 },
      { header: 'Customer', key: 'name', width: 22 }, { header: 'Email', key: 'email', width: 28 }, { header: 'Phone', key: 'phone', width: 16 },
      { header: 'Items', key: 'items', width: 40 }, { header: 'Units', key: 'units', width: 8 },
      { header: 'Subtotal', key: 'sub', width: 12 }, { header: 'Shipping', key: 'ship', width: 10 }, { header: 'Total', key: 'total', width: 12 },
      { header: 'Payment method', key: 'pm', width: 14 }, { header: 'Payment status', key: 'ps', width: 14 }, { header: 'Order status', key: 'st', width: 16 },
      { header: 'City', key: 'city', width: 16 }, { header: 'State', key: 'state', width: 16 }, { header: 'Pincode', key: 'pin', width: 10 },
      { header: 'Courier', key: 'courier', width: 14 }, { header: 'Tracking no.', key: 'track', width: 18 },
    ];
    orders.forEach((o) => ws.addRow({
      no: o.orderNumber, date: o.createdAt.toISOString().replace('T', ' ').slice(0, 16),
      name: o.user?.name || o.shippingAddress.fullName, email: o.user?.email || '', phone: o.shippingAddress.phone,
      items: o.items.map((i) => `${i.name} x${i.qty}`).join('; '), units: o.items.reduce((s, i) => s + i.qty, 0),
      sub: o.itemsPrice, ship: o.shippingPrice, total: o.totalPrice, pm: o.paymentMethod, ps: o.paymentStatus, st: o.status,
      city: o.shippingAddress.city, state: o.shippingAddress.state, pin: o.shippingAddress.pincode, courier: o.courier || '', track: o.trackingNumber || '',
    }));
    ws.getRow(1).font = { bold: true };
    ws.views = [{ state: 'frozen', ySplit: 1 }];

    const stamp = new Date().toISOString().slice(0, 10);
    if (req.query.format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="orders-${stamp}.csv"`);
      return wb.csv.write(res).then(() => res.end());
    }
    // second sheet: totals by status
    const sum = wb.addWorksheet('Summary');
    sum.columns = [{ header: 'Status', key: 's', width: 20 }, { header: 'Orders', key: 'c', width: 10 }, { header: 'Value', key: 'v', width: 14 }];
    const agg = {};
    orders.forEach((o) => { agg[o.status] = agg[o.status] || { c: 0, v: 0 }; agg[o.status].c++; agg[o.status].v += o.totalPrice; });
    Object.entries(agg).forEach(([s, a]) => sum.addRow({ s, c: a.c, v: a.v }));
    sum.addRow({ s: 'All orders', c: orders.length, v: orders.reduce((t, o) => t + o.totalPrice, 0) }).font = { bold: true };
    sum.getRow(1).font = { bold: true };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="orders-${stamp}.xlsx"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (e) { next(e); }
});

router.put('/orders/:id/status', async (req, res, next) => {
  try {
    const { status, note, courier, trackingNumber } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (status === 'Cancelled' && (
      order.delhiveryShipmentCreated ||
      ['creating', 'unknown'].includes(order.delhiveryShipmentState) ||
      order.shiprocketOrderCreated ||
      ['creating', 'unknown'].includes(order.shiprocketOrderState)
    )) {
      return res.status(409).json({ message: 'Verify or cancel the courier order before cancelling this order' });
    }
    if (courier !== undefined) order.courier = courier;
    if (trackingNumber !== undefined) order.trackingNumber = trackingNumber;
    if (status && status !== order.status) {
      const wasCancelled = order.status === 'Cancelled';
      order.status = status;
      order.tracking.push({ status, note: note || '' });
      if (status === 'Delivered' && order.paymentMethod === 'COD') order.paymentStatus = 'Paid'; // cash collected
      if (status === 'Cancelled' && !wasCancelled) {
        if (order.paymentStatus === 'Paid') order.paymentStatus = 'Refunded';
        await Promise.all(order.items.map((i) => Product.updateOne({ _id: i.product }, { $inc: { stock: i.qty } })));
      }
    } else if (note) {
      order.tracking.push({ status: order.status, note });
    }
    await order.save();
    res.json(await order.populate('user', 'name email phone'));
  } catch (e) { next(e); }
});

/* ---------- image upload ---------- */
router.post('/upload', upload.array('images', 6), (req, res) => {
  res.json({ urls: req.files.map((f) => `/uploads/${f.filename}`) });
});

/* ---------- users ---------- */
router.get('/users', async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.q) { const re = new RegExp(req.query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'); filter.$or = [{ name: re }, { email: re }]; }
    if (req.query.role) filter.role = req.query.role;
    const users = await User.find(filter).sort({ createdAt: -1 }).limit(200);
    const stats = await Order.aggregate([{ $match: { status: { $ne: 'Cancelled' } } }, { $group: { _id: '$user', orders: { $sum: 1 }, spent: { $sum: '$totalPrice' } } }]);
    const sm = Object.fromEntries(stats.map((s) => [String(s._id), s]));
    res.json(users.map((u) => ({ ...publicUser(u), isBlocked: u.isBlocked, orders: sm[u._id]?.orders || 0, spent: sm[u._id]?.spent || 0 })));
  } catch (e) { next(e); }
});

// create another admin profile (or customer or courier)
router.post('/users', async (req, res, next) => {
  try {
    const { name, email, password, role = 'admin', vehicleNumber, vehicleType } = req.body;
    if (!name || !email || !password || password.length < 8) return res.status(400).json({ message: 'Name, email and a password of 8+ characters are required' });
    if (await User.findOne({ email: email.toLowerCase() })) return res.status(409).json({ message: 'Email already in use' });
    const userData = { name, email, password, role };
    if (role === 'courier') {
      if (vehicleNumber) userData.vehicleNumber = vehicleNumber;
      if (vehicleType) userData.vehicleType = vehicleType;
    }
    const u = await User.create(userData);
    res.status(201).json(publicUser(u));
  } catch (e) { next(e); }
});

router.put('/users/:id', async (req, res, next) => {
  try {
    if (String(req.params.id) === String(req.user._id)) return res.status(400).json({ message: 'You cannot change your own role or block yourself' });
    const u = await User.findById(req.params.id);
    if (!u) return res.status(404).json({ message: 'User not found' });
    if (req.body.role) u.role = req.body.role;
    if (req.body.isBlocked !== undefined) u.isBlocked = req.body.isBlocked;
    await u.save();
    res.json({ ...publicUser(u), isBlocked: u.isBlocked });
  } catch (e) { next(e); }
});

// a customer's full order history for the admin
router.get('/users/:id/orders', async (req, res, next) => {
  try { res.json(await Order.find({ user: req.params.id }).sort({ createdAt: -1 })); } catch (e) { next(e); }
});

module.exports = router;

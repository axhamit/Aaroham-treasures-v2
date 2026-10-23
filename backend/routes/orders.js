const router = require('express').Router();
const crypto = require('crypto');
const Razorpay = require('razorpay');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const Setting = require('../models/Setting');
const { protect } = require('../middleware/auth');
const { createShipmentForOrder } = require('../utils/delhiveryFulfillment');
const delhiveryService = require('../utils/delhivery');

router.use(protect);

function customerOrderView(order) {
  const data = order.toObject();
  delete data.delhiveryWaybill;
  delete data.delhiveryStatus;
  delete data.delhiveryTracking;
  delete data.delhiveryShipmentCreated;
  delete data.delhiveryShipmentState;
  delete data.delhiveryShipmentAttemptedAt;
  delete data.delhiveryPickupScheduled;
  delete data.shiprocketOrderId;
  delete data.shiprocketShipmentId;
  delete data.shiprocketOrderCreated;
  delete data.shiprocketOrderState;
  delete data.shiprocketOrderAttemptedAt;
  data.tracking = data.tracking.filter((event) => !event.status?.startsWith('Shipment'));
  return data;
}

const hasRazorpay = () => !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
const rzp = () => new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });

async function razorpayPayload(order) {
  if (!hasRazorpay()) return null; // demo mode (development only)
  const r = await rzp().orders.create({ amount: Math.round(order.totalPrice * 100), currency: 'INR', receipt: order.orderNumber });
  order.razorpayOrderId = r.id;
  await order.save();
  return { key: process.env.RAZORPAY_KEY_ID, orderId: r.id, amount: r.amount };
}

// Create an order from the user's cart. Prices always come from the database, never from the client.
router.post('/', async (req, res, next) => {
  try {
    const { addressId, paymentMethod } = req.body;
    if (!['COD', 'ONLINE'].includes(paymentMethod)) return res.status(400).json({ message: 'Choose a payment method' });
    const address = req.user.addresses.id(addressId);
    if (!address) return res.status(400).json({ message: 'Select a delivery address' });

    const user = await User.findById(req.user._id).populate('cart.product');
    const lines = user.cart.filter((i) => i.product && i.product.isActive);
    if (!lines.length) return res.status(400).json({ message: 'Your bag is empty' });

    for (const l of lines) {
      if (l.product.stock < l.qty) return res.status(400).json({ message: `Only ${l.product.stock} left of ${l.product.name}` });
    }

    const settings = await Setting.get();
    const itemsPrice = lines.reduce((s, l) => s + l.product.price * l.qty, 0);
    const shippingPrice = itemsPrice >= settings.freeShippingAbove ? 0 : settings.shippingFee;

    const order = await Order.create({
      user: user._id,
      items: lines.map((l) => ({ product: l.product._id, name: l.product.name, image: l.product.images[0], price: l.product.price, qty: l.qty })),
      shippingAddress: address.toObject(),
      paymentMethod,
      itemsPrice,
      shippingPrice,
      totalPrice: itemsPrice + shippingPrice,
      tracking: [{ status: 'Placed', note: 'Order received' }],
    });

    // reserve stock and empty the cart
    await Promise.all(lines.map((l) => Product.updateOne({ _id: l.product._id }, { $inc: { stock: -l.qty } })));
    user.cart = [];
    await user.save();

    const razorpay = paymentMethod === 'ONLINE' ? await razorpayPayload(order) : null;
    const delivery = paymentMethod === 'COD' ? await createShipmentForOrder(order) : null;
    const currentOrder = delivery ? await Order.findById(order._id) : order;
    res.status(201).json({
      order: customerOrderView(currentOrder),
      razorpay,
      demoPayment: paymentMethod === 'ONLINE' && !hasRazorpay(),
      delivery,
    });
  } catch (e) { next(e); }
});

router.get('/mine', async (req, res, next) => {
  try { res.json((await Order.find({ user: req.user._id }).sort({ createdAt: -1 })).map(customerOrderView)); } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order || (String(order.user) !== String(req.user._id) && req.user.role !== 'admin')) return res.status(404).json({ message: 'Order not found' });
    res.json(req.user.role === 'admin' ? order : customerOrderView(order));
  } catch (e) { next(e); }
});

// Retry payment for an unpaid online order
router.post('/:id/pay', async (req, res, next) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
    if (!order || order.paymentMethod !== 'ONLINE' || order.paymentStatus === 'Paid' || order.status === 'Cancelled') return res.status(400).json({ message: 'This order cannot be paid' });
    res.json({ order: customerOrderView(order), razorpay: await razorpayPayload(order), demoPayment: !hasRazorpay() });
  } catch (e) { next(e); }
});

// Verify the Razorpay signature, then mark as paid
router.post('/:id/verify-payment', async (req, res, next) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, mock } = req.body;

    if (hasRazorpay()) {
      const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${order.razorpayOrderId}|${razorpay_payment_id}`).digest('hex');
      if (razorpay_order_id !== order.razorpayOrderId || expected !== razorpay_signature) {
        order.paymentStatus = 'Failed';
        await order.save();
        return res.status(400).json({ message: 'Payment verification failed' });
      }
      order.razorpayPaymentId = razorpay_payment_id;
    } else if (mock && process.env.NODE_ENV !== 'production') {
      order.razorpayPaymentId = 'demo_' + Date.now();
    } else {
      return res.status(400).json({ message: 'Online payments are not configured' });
    }
    order.paymentStatus = 'Paid';
    order.tracking.push({ status: order.status, note: 'Payment received' });
    await order.save();
    const delivery = await createShipmentForOrder(order);
    const updatedOrder = await Order.findById(order._id);
    const responseOrder = customerOrderView(updatedOrder);
    responseOrder.delivery = delivery;
    res.json(responseOrder);
  } catch (e) { next(e); }
});

// Customer can cancel before the order is shipped
router.put('/:id/cancel', async (req, res, next) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (!['Placed', 'Confirmed', 'Packed'].includes(order.status)) return res.status(400).json({ message: 'This order has already shipped and cannot be cancelled' });
    if (['creating', 'unknown'].includes(order.delhiveryShipmentState)) {
      return res.status(409).json({ message: 'A courier order exists or may have been created. Verify or cancel it with the courier before cancelling this order.' });
    }
    if (order.shiprocketOrderCreated || ['creating', 'unknown'].includes(order.shiprocketOrderState)) {
      return res.status(409).json({ message: 'A legacy Shiprocket order exists or may have been created. Verify or cancel it with Shiprocket before cancelling this order.' });
    }
    if (order.delhiveryShipmentCreated) {
      const result = await delhiveryService.cancelShipment(order.delhiveryWaybill);
      if (!result.success) return res.status(502).json(result);
      order.delhiveryShipmentCreated = false;
      order.delhiveryShipmentState = 'cancelled';
      order.delhiveryStatus = 'Cancelled';
      order.tracking.push({ status: 'Shipment Cancelled', note: 'Delhivery shipment cancelled with customer order', at: new Date() });
    }
    order.status = 'Cancelled';
    if (order.paymentStatus === 'Paid') order.paymentStatus = 'Refunded'; // trigger the actual refund from your Razorpay dashboard
    order.tracking.push({ status: 'Cancelled', note: 'Cancelled by customer' });
    await order.save();
    await Promise.all(order.items.map((i) => Product.updateOne({ _id: i.product }, { $inc: { stock: i.qty } })));
    res.json(customerOrderView(order));
  } catch (e) { next(e); }
});

module.exports = router;

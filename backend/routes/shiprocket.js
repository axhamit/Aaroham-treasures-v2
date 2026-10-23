const express = require('express');
const mongoose = require('mongoose');
const Order = require('../models/Order');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();
const asyncHandler = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

router.use(protect, adminOnly);

const findOrder = async (orderId, res) => {
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    res.status(400).json({ message: 'Invalid order id' });
    return null;
  }
  const order = await Order.findById(orderId);
  if (!order) res.status(404).json({ message: 'Order not found' });
  return order;
};

router.post('/orders/:orderId/reconcile-order', asyncHandler(async (req, res) => {
  const order = await findOrder(req.params.orderId, res);
  if (!order) return;
  if (req.body.confirmedNoOrder !== true) {
    return res.status(400).json({ message: 'Confirm that this order does not exist in Shiprocket before allowing a retry' });
  }
  if (order.shiprocketOrderState !== 'unknown') {
    return res.status(409).json({ message: 'Only orders with an uncertain Shiprocket result can be reconciled' });
  }

  order.shiprocketOrderState = 'not_created';
  order.tracking.push({
    status: 'Legacy Shiprocket Record Reconciled',
    note: 'Admin verified that no legacy Shiprocket order exists',
  });
  await order.save();
  res.json({ message: 'Legacy order record reconciled; new shipments are created through Delhivery', order });
}));

router.post('/orders/:orderId/confirm-cancellation', asyncHandler(async (req, res) => {
  const order = await findOrder(req.params.orderId, res);
  if (!order) return;
  if (req.body.confirmedCancellation !== true) {
    return res.status(400).json({ message: 'Confirm that the order was cancelled in Shiprocket' });
  }
  if (!order.shiprocketOrderCreated || order.shiprocketOrderState !== 'created') {
    return res.status(409).json({ message: 'This order does not have an active Shiprocket order to cancel' });
  }

  order.shiprocketOrderCreated = false;
  order.shiprocketOrderState = 'cancelled';
  order.tracking.push({
    status: 'Shiprocket Order Cancelled',
    note: 'Admin confirmed that this order was cancelled in Shiprocket',
  });
  await order.save();
  res.json({ message: 'Shiprocket cancellation recorded. You can now cancel the store order.', order });
}));

module.exports = router;

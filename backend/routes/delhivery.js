const express = require('express');
const mongoose = require('mongoose');
const Order = require('../models/Order');
const { protect, adminOnly } = require('../middleware/auth');
const delhiveryService = require('../utils/delhivery');
const { createShipmentForOrder, defaultParcel } = require('../utils/delhiveryFulfillment');

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

const toTrackingEvents = (tracks) => {
  if (!Array.isArray(tracks)) return [];
  return tracks.map((event) => {
    const rawDate = event?.StatusDateTime || event?.ScanDateTime || event?.Date;
    const date = rawDate && !Number.isNaN(Date.parse(rawDate)) ? new Date(rawDate) : null;
    return {
      status: event?.Status || event?.StatusType || '',
      location: event?.Origin || event?.Location || '',
      date,
      description: event?.Instructions || event?.Status || '',
    };
  });
};

const mapShipmentStatus = (status) => ({
  Manifested: 'Confirmed',
  'Picked Up': 'Packed',
  'In Transit': 'Shipped',
  'Out for Delivery': 'Out for delivery',
  Delivered: 'Delivered',
  Cancelled: 'Cancelled',
}[status]);

router.get('/serviceability/:pincode', asyncHandler(async (req, res) => {
  if (!/^\d{6}$/.test(req.params.pincode)) {
    return res.status(400).json({ message: 'Pincode must be a valid 6-digit number' });
  }

  const result = await delhiveryService.checkServiceability(req.params.pincode);
  res.status(result.success ? 200 : 502).json(result);
}));

router.get('/waybills/:count', asyncHandler(async (req, res) => {
  const count = Number(req.params.count);
  if (!Number.isInteger(count) || count < 1 || count > 100) {
    return res.status(400).json({ message: 'Waybill count must be between 1 and 100' });
  }

  const result = await delhiveryService.fetchWaybills(count);
  res.status(result.success ? 200 : 502).json(result);
}));

router.post('/orders/:orderId/create-shipment', asyncHandler(async (req, res) => {
  const order = await findOrder(req.params.orderId, res);
  if (!order) return;
  const body = req.body || {};
  const parcel = ['weight', 'length', 'breadth', 'height'].some((key) => body[key] !== undefined)
    ? Object.fromEntries(['weight', 'length', 'breadth', 'height'].map((key) => [key, body[key]]))
    : defaultParcel();
  const result = await createShipmentForOrder(order, parcel);
  if (!result.success) {
    const status = result.indeterminate ? 502 : result.message.includes('must be confirmed') ? 409 : 400;
    return res.status(status).json(result);
  }
  const updatedOrder = await Order.findById(order._id);
  res.json({
    message: result.alreadyCreated ? 'Delhivery shipment already exists for this order' : 'Delhivery shipment created successfully',
    waybill: result.waybill,
    order: updatedOrder,
  });
}));

router.get('/track/:waybill', asyncHandler(async (req, res) => {
  if (!/^[A-Za-z0-9-]{1,40}$/.test(req.params.waybill)) {
    return res.status(400).json({ message: 'Invalid waybill' });
  }
  const result = await delhiveryService.trackShipment(req.params.waybill);
  res.status(result.success ? 200 : 502).json(result);
}));

router.get('/orders/:orderId/track', asyncHandler(async (req, res) => {
  const order = await findOrder(req.params.orderId, res);
  if (!order) return;
  if (!order.delhiveryWaybill) return res.status(400).json({ message: 'No Delhivery waybill found for this order' });

  const result = await delhiveryService.trackShipment(order.delhiveryWaybill);
  if (!result.success) return res.status(502).json(result);

  const shipment = result.tracking[0]?.Shipment || {};
  const status = shipment.Status?.Status || shipment.Status?.StatusType || '';
  order.delhiveryTracking = toTrackingEvents(shipment.Track);
  order.delhiveryStatus = status;
  const mappedStatus = mapShipmentStatus(status);
  if (mappedStatus && order.status !== mappedStatus) {
    order.status = mappedStatus;
    order.tracking.push({ status: mappedStatus, note: `Delhivery status: ${status}`, at: new Date() });
    if (mappedStatus === 'Delivered' && order.paymentMethod === 'COD') order.paymentStatus = 'Paid';
  }
  await order.save();
  res.json({ ...result, order });
}));

router.post('/orders/:orderId/cancel-shipment', asyncHandler(async (req, res) => {
  const order = await findOrder(req.params.orderId, res);
  if (!order) return;
  if (!order.delhiveryWaybill || !order.delhiveryShipmentCreated) {
    return res.status(400).json({ message: 'No active Delhivery shipment found for this order' });
  }

  const result = await delhiveryService.cancelShipment(order.delhiveryWaybill);
  if (!result.success) return res.status(502).json(result);

  order.delhiveryShipmentCreated = false;
  order.delhiveryShipmentState = 'not_created';
  order.delhiveryStatus = 'Cancelled';
  order.tracking.push({ status: 'Shipment Cancelled', note: 'Delhivery shipment cancelled by admin', at: new Date() });
  await order.save();
  res.json({ ...result, order });
}));

router.post('/orders/:orderId/reconcile-shipment', asyncHandler(async (req, res) => {
  const order = await findOrder(req.params.orderId, res);
  if (!order) return;
  if (req.body.confirmedNoShipment !== true) {
    return res.status(400).json({ message: 'Confirm that no Delhivery shipment exists before allowing a retry' });
  }
  if (order.delhiveryShipmentState !== 'unknown') {
    return res.status(409).json({ message: 'Only shipments with an uncertain creation result can be reconciled' });
  }

  order.delhiveryShipmentState = 'not_created';
  order.tracking.push({
    status: 'Shipment Retry Authorized',
    note: 'Admin verified no shipment exists in Delhivery',
    at: new Date(),
  });
  await order.save();
  res.json({ message: 'Shipment may now be created again', order });
}));

router.put('/orders/:orderId/update-shipment', asyncHandler(async (req, res) => {
  const order = await findOrder(req.params.orderId, res);
  if (!order) return;
  if (!order.delhiveryWaybill || !order.delhiveryShipmentCreated) {
    return res.status(400).json({ message: 'No active Delhivery shipment found for this order' });
  }

  const allowedFields = ['name', 'add', 'pin', 'phone', 'city', 'state'];
  const updateData = Object.fromEntries(
    Object.entries(req.body).filter(([key, value]) => allowedFields.includes(key) && typeof value === 'string' && value.trim())
  );
  if (!Object.keys(updateData).length) {
    return res.status(400).json({ message: 'Provide at least one valid shipment detail to update' });
  }
  if (updateData.pin && !/^\d{6}$/.test(updateData.pin)) {
    return res.status(400).json({ message: 'Pincode must be a valid 6-digit number' });
  }
  if (updateData.phone && !/^[0-9+() -]{7,20}$/.test(updateData.phone)) {
    return res.status(400).json({ message: 'Phone number is invalid' });
  }

  const result = await delhiveryService.updateShipment(order.delhiveryWaybill, updateData);
  if (!result.success) return res.status(502).json(result);
  order.tracking.push({ status: 'Shipment Updated', note: 'Delhivery shipment details updated by admin', at: new Date() });
  await order.save();
  res.json(result);
}));

router.get('/orders/:orderId/label', asyncHandler(async (req, res) => {
  const order = await findOrder(req.params.orderId, res);
  if (!order) return;
  if (!order.delhiveryWaybill) return res.status(400).json({ message: 'No Delhivery waybill found for this order' });

  const result = await delhiveryService.generateLabel(order.delhiveryWaybill);
  if (!result.success) return res.status(502).json(result);
  const filename = String(order.orderNumber).replace(/[^A-Za-z0-9_-]/g, '_');
  res.setHeader('Content-Type', result.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="label-${filename}.pdf"`);
  res.send(result.labelData);
}));

module.exports = router;

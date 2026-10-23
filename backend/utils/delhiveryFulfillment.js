const Order = require('../models/Order');
const delhiveryService = require('./delhivery');

const defaultParcel = () => ({
  weight: Number(process.env.DELHIVERY_DEFAULT_WEIGHT_KG || 0.5),
  length: Number(process.env.DELHIVERY_DEFAULT_LENGTH_CM || 20),
  breadth: Number(process.env.DELHIVERY_DEFAULT_BREADTH_CM || 15),
  height: Number(process.env.DELHIVERY_DEFAULT_HEIGHT_CM || 10),
});

async function createShipmentForOrder(order, parcel = defaultParcel()) {
  const dimensions = [parcel.weight, parcel.length, parcel.breadth, parcel.height].map(Number);
  if (dimensions.some((value) => !Number.isFinite(value) || value <= 0)) {
    return { success: false, message: 'Configure valid Delhivery default parcel weight and dimensions' };
  }
  if (order.status === 'Cancelled') {
    return { success: false, message: 'Cannot create a shipment for a cancelled order' };
  }
  if (order.paymentMethod === 'ONLINE' && order.paymentStatus !== 'Paid') {
    return { success: false, message: 'Online payment must be confirmed before creating a shipment' };
  }
  if (
    !order.shippingAddress?.fullName?.trim() ||
    !order.shippingAddress?.line1 ||
    !order.shippingAddress?.city ||
    !order.shippingAddress?.state ||
    !order.shippingAddress?.phone ||
    !/^\d{6}$/.test(order.shippingAddress?.pincode || '')
  ) {
    return { success: false, message: 'The order is missing required recipient or address details' };
  }

  await Order.updateOne(
    {
      _id: order._id,
      delhiveryShipmentState: 'creating',
      delhiveryShipmentAttemptedAt: { $lt: new Date(Date.now() - 10 * 60 * 1000) },
    },
    { $set: { delhiveryShipmentState: 'unknown' } }
  );
  const reservedOrder = await Order.findOneAndUpdate(
    {
      _id: order._id,
      status: { $ne: 'Cancelled' },
      delhiveryShipmentCreated: { $ne: true },
      delhiveryShipmentState: { $nin: ['creating', 'unknown'] },
    },
    { $set: { delhiveryShipmentState: 'creating', delhiveryShipmentAttemptedAt: new Date() } },
    { new: true }
  );
  if (!reservedOrder) {
    const current = await Order.findById(order._id).select('status delhiveryShipmentCreated delhiveryShipmentState delhiveryWaybill');
    if (current?.status === 'Cancelled') {
      return { success: false, message: 'Cannot create a shipment for a cancelled order' };
    }
    if (current?.delhiveryShipmentCreated || current?.delhiveryShipmentState === 'created') {
      return { success: true, alreadyCreated: true, waybill: current.delhiveryWaybill };
    }
    if (current?.delhiveryShipmentState === 'unknown') {
      return {
        success: false,
        indeterminate: true,
        message: 'Shipment creation has an uncertain result. Verify it with Delhivery before retrying to avoid a duplicate shipment.',
      };
    }
    return { success: false, indeterminate: true, message: 'Shipment creation is already in progress' };
  }

  const address = reservedOrder.shippingAddress;
  const result = await delhiveryService.createShipment({
    orderId: reservedOrder.orderNumber,
    consigneeName: address.fullName,
    address: [address.line1, address.line2, address.city].filter(Boolean).join(', '),
    pincode: address.pincode,
    state: address.state,
    country: address.country || 'India',
    phone: address.phone,
    paymentMode: reservedOrder.paymentMethod === 'COD' ? 'COD' : 'Prepaid',
    codAmount: reservedOrder.paymentMethod === 'COD' ? reservedOrder.totalPrice : 0,
    weight: dimensions[0],
    length: dimensions[1],
    breadth: dimensions[2],
    height: dimensions[3],
    quantity: reservedOrder.items.reduce((sum, item) => sum + item.qty, 0),
    sellerName: process.env.DELHIVERY_CLIENT_NAME,
    orderType: 'forward',
  });

  if (!result.success) {
    reservedOrder.delhiveryShipmentState = result.indeterminate ? 'unknown' : 'not_created';
    await reservedOrder.save();
    return result;
  }

  reservedOrder.delhiveryWaybill = result.waybill;
  reservedOrder.delhiveryShipmentCreated = true;
  reservedOrder.delhiveryShipmentState = 'created';
  reservedOrder.delhiveryStatus = 'Manifested';
  reservedOrder.trackingNumber = result.waybill;
  reservedOrder.courier = 'Delhivery';
  reservedOrder.assignedCourier = null;
  reservedOrder.tracking.push({
    status: 'Shipment Created',
    note: 'Delhivery shipment created',
    at: new Date(),
  });
  await reservedOrder.save();
  return { success: true, waybill: result.waybill };
}

module.exports = { createShipmentForOrder, defaultParcel };

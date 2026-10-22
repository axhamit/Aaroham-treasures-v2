const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const User = require('../models/User');
const { protect, courierOnly } = require('../middleware/auth');
const { generateQRCode } = require('../utils/qrCode');
const dummyBank = require('../utils/dummyBank');

// Get courier's assigned orders
router.get('/orders', protect, courierOnly, async (req, res) => {
  try {
    const orders = await Order.find({ assignedCourier: req.user._id })
      .populate('user', 'name email phone')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch orders' });
  }
});

// Get single order details
router.get('/orders/:id', protect, courierOnly, async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      assignedCourier: req.user._id,
    }).populate('user', 'name email phone addresses');

    if (!order) {
      return res.status(404).json({ message: 'Order not found or not assigned to you' });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch order' });
  }
});

// Generate QR code for order payment verification
router.get('/orders/:id/qr', protect, courierOnly, async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      assignedCourier: req.user._id,
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found or not assigned to you' });
    }

    // Generate QR code with order details
    const qrData = JSON.stringify({
      orderId: order._id,
      orderNumber: order.orderNumber,
      amount: order.totalPrice,
      deliveryOTP: order.deliveryOTP,
    });

    const qrCode = await generateQRCode(qrData);

    res.json({ qrCode, deliveryOTP: order.deliveryOTP });
  } catch (error) {
    res.status(500).json({ message: 'Failed to generate QR code' });
  }
});

// Verify payment (dummy bank verification)
router.post('/orders/:id/verify-payment', protect, courierOnly, async (req, res) => {
  try {
    const { paymentMethod, amount, transactionId } = req.body;

    const order = await Order.findOne({
      _id: req.params.id,
      assignedCourier: req.user._id,
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found or not assigned to you' });
    }

    if (order.paymentVerified) {
      return res.status(400).json({ message: 'Payment already verified' });
    }

    if (!paymentMethod || !amount) {
      return res.status(400).json({ message: 'Payment method and amount are required' });
    }

    if (Math.abs(amount - order.totalPrice) > 0.01) {
      return res.status(400).json({ message: 'Amount does not match order total' });
    }

    // Use dummy bank verification
    let bankVerification;
    if (paymentMethod === 'UPI') {
      bankVerification = await dummyBank.verifyUPIPayment(transactionId, amount);
    } else {
      bankVerification = await dummyBank.verifyTransaction(transactionId, amount);
    }

    if (!bankVerification.success) {
      return res.status(400).json({ message: bankVerification.error || 'Payment verification failed' });
    }

    // Record the transaction in dummy bank
    dummyBank.addTransaction({
      transactionId: bankVerification.transactionId,
      amount,
      paymentMethod,
      accountNumber: 'COURIER-' + req.user._id,
    });

    // Update order with payment verification
    order.paymentVerified = true;
    order.paymentVerifiedBy = req.user._id;
    order.paymentVerifiedAt = new Date();
    order.paymentStatus = 'Paid';
    order.tracking.push({
      status: 'Payment Verified',
      note: `Payment verified by courier. Method: ${paymentMethod}, Transaction ID: ${bankVerification.transactionId}, Bank: ${bankVerification.bankName || 'N/A'}`,
      at: new Date(),
    });

    await order.save();

    res.json({ message: 'Payment verified successfully', order, bankVerification });
  } catch (error) {
    res.status(500).json({ message: 'Failed to verify payment' });
  }
});

// Update order status (delivery flow)
router.put('/orders/:id/status', protect, courierOnly, async (req, res) => {
  try {
    const { status, note } = req.body;

    const order = await Order.findOne({
      _id: req.params.id,
      assignedCourier: req.user._id,
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found or not assigned to you' });
    }

    // Validate status transition
    const validStatuses = ['Out for delivery', 'Delivered'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status for courier' });
    }

    // Update courier status
    if (status === 'Out for delivery') {
      req.user.courierStatus = 'On Delivery';
      await req.user.save();
    } else if (status === 'Delivered') {
      req.user.courierStatus = 'Available';
      await req.user.save();
    }

    order.status = status;
    order.tracking.push({
      status,
      note: note || `Status updated by courier ${req.user.name}`,
      at: new Date(),
    });

    await order.save();

    res.json({ message: 'Order status updated successfully', order });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update order status' });
  }
});

// Verify delivery OTP
router.post('/orders/:id/verify-otp', protect, courierOnly, async (req, res) => {
  try {
    const { otp } = req.body;

    const order = await Order.findOne({
      _id: req.params.id,
      assignedCourier: req.user._id,
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found or not assigned to you' });
    }

    if (order.deliveryOTPVerified) {
      return res.status(400).json({ message: 'OTP already verified' });
    }

    if (otp !== order.deliveryOTP) {
      order.deliveryAttemptCount += 1;
      await order.save();

      if (order.deliveryAttemptCount >= 3) {
        return res.status(400).json({ message: 'Too many failed attempts. Please contact support.' });
      }

      return res.status(400).json({ message: 'Invalid OTP' });
    }

    order.deliveryOTPVerified = true;
    order.status = 'Delivered';
    order.tracking.push({
      status: 'Delivered',
      note: 'Delivery confirmed with OTP verification',
      at: new Date(),
    });

    // Update courier status back to available
    req.user.courierStatus = 'Available';
    await req.user.save();

    await order.save();

    res.json({ message: 'Delivery confirmed successfully', order });
  } catch (error) {
    res.status(500).json({ message: 'Failed to verify OTP' });
  }
});

// Update courier own status (Available/On Delivery/Offline)
router.put('/status', protect, courierOnly, async (req, res) => {
  try {
    const { courierStatus } = req.body;

    const validStatuses = ['Available', 'On Delivery', 'Offline'];
    if (!validStatuses.includes(courierStatus)) {
      return res.status(400).json({ message: 'Invalid courier status' });
    }

    req.user.courierStatus = courierStatus;
    await req.user.save();

    res.json({ message: 'Courier status updated successfully', courierStatus });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update courier status' });
  }
});

// Get courier profile
router.get('/profile', protect, courierOnly, async (req, res) => {
  try {
    const courier = await User.findById(req.user._id).select('-password');
    res.json(courier);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch profile' });
  }
});

// Update courier profile
router.put('/profile', protect, courierOnly, async (req, res) => {
  try {
    const { name, phone, vehicleNumber, vehicleType } = req.body;

    const allowedUpdates = ['name', 'phone', 'vehicleNumber', 'vehicleType'];
    const updates = {};

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const courier = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({ message: 'Profile updated successfully', courier });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

module.exports = router;

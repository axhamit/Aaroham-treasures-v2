const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const { protect, adminOnly } = require('../middleware/auth');
const delhiveryService = require('../utils/delhivery');

// Check serviceability for a pincode
router.get('/serviceability/:pincode', protect, adminOnly, async (req, res) => {
  try {
    const { pincode } = req.params;
    const result = await delhiveryService.checkServiceability(pincode);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Failed to check serviceability', error: error.message });
  }
});

// Fetch waybills in bulk
router.get('/waybills/:count', protect, adminOnly, async (req, res) => {
  try {
    const count = parseInt(req.params.count) || 10;
    const result = await delhiveryService.fetchWaybills(count);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch waybills', error: error.message });
  }
});

// Create shipment for an order
router.post('/orders/:orderId/create-shipment', protect, adminOnly, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.delhiveryShipmentCreated) {
      return res.status(400).json({ message: 'Shipment already created for this order' });
    }

    // Prepare order data for Delhivery
    const orderData = {
      orderId: order.orderNumber,
      consigneeName: order.shippingAddress.fullName,
      address: `${order.shippingAddress.line1}${order.shippingAddress.line2 ? ', ' + order.shippingAddress.line2 : ''}`,
      pincode: order.shippingAddress.pincode,
      state: order.shippingAddress.state,
      country: order.shippingAddress.country || 'India',
      phone: order.shippingAddress.phone,
      paymentMode: order.paymentMethod === 'COD' ? 'COD' : 'Prepaid',
      codAmount: order.paymentMethod === 'COD' ? order.totalPrice : 0,
      weight: 0.5, // Default weight in kg - should be calculated from items
      length: 10,
      breadth: 10,
      height: 10,
      quantity: order.items.reduce((sum, item) => sum + item.qty, 0),
      sellerName: process.env.DELHIVERY_CLIENT_NAME || 'Aaroham treasures',
      orderType: 'forward',
      shipmentType: 'Single Piece',
      fragile: false,
    };

    const result = await delhiveryService.createShipment(orderData);

    if (result.success) {
      // Update order with Delhivery details
      order.delhiveryWaybill = result.waybill;
      order.delhiveryShipmentCreated = true;
      order.trackingNumber = result.waybill;
      order.courier = 'Delhivery';
      order.tracking.push({
        status: 'Shipment Created',
        note: `Delhivery waybill: ${result.waybill}`,
        at: new Date(),
      });

      await order.save();

      res.json({
        message: 'Shipment created successfully',
        waybill: result.waybill,
        order,
      });
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({ message: 'Failed to create shipment', error: error.message });
  }
});

// Track shipment
router.get('/track/:waybill', protect, adminOnly, async (req, res) => {
  try {
    const { waybill } = req.params;
    const result = await delhiveryService.trackShipment(waybill);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Failed to track shipment', error: error.message });
  }
});

// Track shipment for specific order
router.get('/orders/:orderId/track', protect, adminOnly, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (!order.delhiveryWaybill) {
      return res.status(400).json({ message: 'No Delhivery waybill found for this order' });
    }

    const result = await delhiveryService.trackShipment(order.delhiveryWaybill);

    if (result.success) {
      // Update order with latest tracking data
      order.delhiveryTracking = result.tracking[0]?.Shipment?.Track || [];
      order.delhiveryStatus = result.tracking[0]?.Shipment?.Status?.Status || '';
      await order.save();
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Failed to track shipment', error: error.message });
  }
});

// Cancel shipment
router.post('/orders/:orderId/cancel-shipment', protect, adminOnly, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (!order.delhiveryWaybill) {
      return res.status(400).json({ message: 'No Delhivery waybill found for this order' });
    }

    const result = await delhiveryService.cancelShipment(order.delhiveryWaybill);

    if (result.success) {
      order.delhiveryShipmentCreated = false;
      order.delhiveryWaybill = null;
      order.tracking.push({
        status: 'Shipment Cancelled',
        note: 'Delhivery shipment cancelled',
        at: new Date(),
      });

      await order.save();
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Failed to cancel shipment', error: error.message });
  }
});

// Generate shipping label
router.get('/orders/:orderId/label', protect, adminOnly, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (!order.delhiveryWaybill) {
      return res.status(400).json({ message: 'No Delhivery waybill found for this order' });
    }

    const result = await delhiveryService.generateLabel(order.delhiveryWaybill);

    if (result.success) {
      res.setHeader('Content-Type', result.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="label-${order.orderNumber}.pdf"`);
      res.send(result.labelData);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({ message: 'Failed to generate label', error: error.message });
  }
});

// Update shipment details
router.put('/orders/:orderId/update-shipment', protect, adminOnly, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (!order.delhiveryWaybill) {
      return res.status(400).json({ message: 'No Delhivery waybill found for this order' });
    }

    const result = await delhiveryService.updateShipment(order.delhiveryWaybill, req.body);

    if (result.success) {
      order.tracking.push({
        status: 'Shipment Updated',
        note: 'Delhivery shipment details updated',
        at: new Date(),
      });

      await order.save();
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update shipment', error: error.message });
  }
});

// Webhook for Delhivery status updates
router.post('/webhook', async (req, res) => {
  try {
    const { waybill, status, shipment_data } = req.body;

    // Find order by waybill
    const order = await Order.findOne({ delhiveryWaybill: waybill });

    if (order) {
      // Update order status based on Delhivery status
      order.delhiveryStatus = status;

      if (shipment_data && shipment_data.Track) {
        order.delhiveryTracking = shipment_data.Track;
      }

      // Map Delhivery status to internal status
      const statusMap = {
        'Manifested': 'Confirmed',
        'Picked Up': 'Packed',
        'In Transit': 'Shipped',
        'Out for Delivery': 'Out for delivery',
        'Delivered': 'Delivered',
        'RTO': 'Cancelled',
        'Cancelled': 'Cancelled',
      };

      if (statusMap[status]) {
        order.status = statusMap[status];
        order.tracking.push({
          status: statusMap[status],
          note: `Updated via Delhivery webhook: ${status}`,
          at: new Date(),
        });
      }

      await order.save();
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delhivery webhook error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

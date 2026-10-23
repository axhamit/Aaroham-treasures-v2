const mongoose = require('mongoose');

const STATUSES = ['Placed', 'Confirmed', 'Packed', 'Shipped', 'Out for delivery', 'Delivered', 'Cancelled'];

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        name: String,
        image: String,
        price: Number,
        qty: Number,
      },
    ],
    shippingAddress: {
      fullName: String,
      phone: String,
      line1: String,
      line2: String,
      city: String,
      state: String,
      pincode: String,
      country: String,
      lat: Number,
      lng: Number,
    },
    paymentMethod: { type: String, enum: ['COD', 'ONLINE'], required: true },
    paymentStatus: { type: String, enum: ['Pending', 'Paid', 'Failed', 'Refunded'], default: 'Pending' },
    razorpayOrderId: String,
    razorpayPaymentId: String,
    itemsPrice: Number,
    shippingPrice: Number,
    totalPrice: Number,
    status: { type: String, enum: STATUSES, default: 'Placed' },
    courier: String,
    trackingNumber: String,
    tracking: [{ status: String, note: String, at: { type: Date, default: Date.now } }],
    // Courier and payment verification fields
    assignedCourier: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    qrCode: String,
    paymentVerified: { type: Boolean, default: false },
    paymentVerifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    paymentVerifiedAt: Date,
    deliveryOTP: String,
    deliveryOTPVerified: { type: Boolean, default: false },
    deliveryAttemptCount: { type: Number, default: 0 },
    // Delhivery integration fields
    delhiveryWaybill: String,
    delhiveryStatus: String,
    delhiveryTracking: [{
      status: String,
      location: String,
      date: Date,
      description: String,
    }],
    delhiveryShipmentCreated: { type: Boolean, default: false },
    delhiveryShipmentState: {
      type: String,
      enum: ['not_created', 'creating', 'created', 'unknown', 'cancelled'],
      default: 'not_created',
    },
    delhiveryShipmentAttemptedAt: Date,
    delhiveryPickupScheduled: { type: Boolean, default: false },
    shiprocketOrderId: String,
    shiprocketShipmentId: String,
    shiprocketOrderCreated: { type: Boolean, default: false },
    shiprocketOrderState: {
      type: String,
      enum: ['not_created', 'creating', 'created', 'unknown'],
      default: 'not_created',
    },
    shiprocketOrderAttemptedAt: Date,
  },
  { timestamps: true }
);

orderSchema.pre('validate', function () {
  if (!this.orderNumber) {
    this.orderNumber = 'LX' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 90 + 10);
  }
});

orderSchema.pre('save', function () {
  if (!this.deliveryOTP) {
    this.deliveryOTP = Math.floor(100000 + Math.random() * 900000).toString();
  }
});

module.exports = mongoose.model('Order', orderSchema);
module.exports.STATUSES = STATUSES;

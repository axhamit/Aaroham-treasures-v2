'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function CourierOrderDetails() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const [order, setOrder] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const [busy, setBusy] = useState(true);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentData, setPaymentData] = useState({ paymentMethod: 'Cash', amount: 0, transactionId: '' });
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otp, setOtp] = useState('');

  useEffect(() => {
    if (!loading && (!user || user.role !== 'courier')) {
      router.replace('/login?next=/courier/orders');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user?.role === 'courier' && params.id) {
      fetchOrder();
    }
  }, [user, params.id]);

  const fetchOrder = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/courier/orders/${params.id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (res.ok) {
        const data = await res.json();
        setOrder(data);
        setPaymentData({ ...paymentData, amount: data.totalPrice });
      } else {
        toast.error('Failed to fetch order');
        router.replace('/courier/orders');
      }
    } catch (err) {
      toast.error('Failed to fetch order');
      router.replace('/courier/orders');
    } finally {
      setBusy(false);
    }
  };

  const fetchQrCode = async () => {
    try {
      const res = await fetch(`/api/courier/orders/${params.id}/qr`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (res.ok) {
        const data = await res.json();
        setQrCode(data.qrCode);
        toast.success('QR code generated. Show this to customer for payment.');
      } else {
        toast.error('Failed to generate QR code');
      }
    } catch (err) {
      toast.error('Failed to generate QR code');
    }
  };

  const verifyPayment = async (e) => {
    e.preventDefault();
    setVerifyingPayment(true);
    try {
      const res = await fetch(`/api/courier/orders/${params.id}/verify-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(paymentData),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success('Payment verified successfully!');
        setShowPaymentModal(false);
        fetchOrder();
      } else {
        const error = await res.json();
        toast.error(error.message || 'Failed to verify payment');
      }
    } catch (err) {
      toast.error('Failed to verify payment');
    } finally {
      setVerifyingPayment(false);
    }
  };

  const updateStatus = async (status) => {
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/courier/orders/${params.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ status, note: `Status updated by courier ${user.name}` }),
      });
      if (res.ok) {
        toast.success(`Order marked as ${status}`);
        fetchOrder();
      } else {
        toast.error('Failed to update status');
      }
    } catch (err) {
      toast.error('Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const verifyOtp = async (e) => {
    e.preventDefault();
    setVerifyingOtp(true);
    try {
      const res = await fetch(`/api/courier/orders/${params.id}/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ otp }),
      });
      if (res.ok) {
        toast.success('Delivery confirmed with OTP!');
        setOtp('');
        fetchOrder();
      } else {
        const error = await res.json();
        toast.error(error.message || 'Invalid OTP');
      }
    } catch (err) {
      toast.error('Failed to verify OTP');
    } finally {
      setVerifyingOtp(false);
    }
  };

  if (loading || !user) return <div className="spinner" />;
  if (busy) return <div className="spinner" />;
  if (!order) return <div className="container page"><p>Order not found</p></div>;

  return (
    <div className="container page">
      <div className="section-header">
        <h1>Order {order.orderNumber}</h1>
        <Link href="/courier/orders" className="btn btn-secondary">Back to Orders</Link>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3>Order Status</h3>
        <div className="stack">
          <p><strong>Status:</strong> {order.status}</p>
          <p><strong>Payment Status:</strong> {order.paymentStatus}</p>
          <p><strong>Payment Verified:</strong> {order.paymentVerified ? 'Yes' : 'No'}</p>
          {order.paymentVerifiedAt && <p><strong>Verified At:</strong> {new Date(order.paymentVerifiedAt).toLocaleString()}</p>}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3>Customer Details</h3>
        <div className="stack">
          <p><strong>Name:</strong> {order.shippingAddress.fullName}</p>
          <p><strong>Phone:</strong> {order.shippingAddress.phone}</p>
          <p><strong>Address:</strong> {order.shippingAddress.line1}, {order.shippingAddress.line2 || ''}</p>
          <p><strong>City:</strong> {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3>Order Items</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Price</th>
              <th>Qty</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, idx) => (
              <tr key={idx}>
                <td>{item.name}</td>
                <td>₹{item.price.toLocaleString()}</td>
                <td>{item.qty}</td>
                <td>₹{(item.price * item.qty).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ marginTop: 20, textAlign: 'right' }}>
          <p><strong>Subtotal:</strong> ₹{order.itemsPrice.toLocaleString()}</p>
          <p><strong>Shipping:</strong> ₹{order.shippingPrice.toLocaleString()}</p>
          <p className="stat-number"><strong>Total:</strong> ₹{order.totalPrice.toLocaleString()}</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3>Delivery OTP</h3>
        <p><strong>OTP:</strong> <span style={{ fontSize: 24, fontWeight: 'bold', letterSpacing: 4 }}>{order.deliveryOTP}</span></p>
        <p className="muted">Share this OTP with customer for delivery confirmation</p>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3>Actions</h3>
        <div className="stack">
          <button
            className="btn btn-primary btn-block"
            onClick={fetchQrCode}
            disabled={qrCode !== null}
          >
            {qrCode ? 'QR Code Generated' : 'Generate QR Code for Payment'}
          </button>

          {!order.paymentVerified && (
            <button
              className="btn btn-success btn-block"
              onClick={() => setShowPaymentModal(true)}
            >
              Verify Payment
            </button>
          )}

          {order.status === 'Shipped' && (
            <button
              className="btn btn-warning btn-block"
              onClick={() => updateStatus('Out for delivery')}
              disabled={updatingStatus}
            >
              {updatingStatus ? 'Updating...' : 'Mark as Out for Delivery'}
            </button>
          )}

          {order.status === 'Out for delivery' && order.paymentVerified && !order.deliveryOTPVerified && (
            <button
              className="btn btn-success btn-block"
              onClick={() => updateStatus('Delivered')}
              disabled={updatingStatus}
            >
              {updatingStatus ? 'Updating...' : 'Mark as Delivered'}
            </button>
          )}
        </div>
      </div>

      {qrCode && (
        <div className="card" style={{ marginBottom: 20, textAlign: 'center' }}>
          <h3>Payment QR Code</h3>
          <img src={qrCode} alt="QR Code" style={{ maxWidth: 300, margin: '20px auto' }} />
          <p className="muted">Show this QR code to customer for payment</p>
        </div>
      )}

      {showPaymentModal && (
        <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Verify Payment</h3>
            <form onSubmit={verifyPayment} className="stack">
              <div className="field">
                <label>Payment Method</label>
                <select
                  className="input"
                  value={paymentData.paymentMethod}
                  onChange={(e) => setPaymentData({ ...paymentData, paymentMethod: e.target.value })}
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Card">Card</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>
              <div className="field">
                <label>Amount (₹)</label>
                <input
                  className="input"
                  type="number"
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData({ ...paymentData, amount: parseFloat(e.target.value) })}
                  required
                />
              </div>
              <div className="field">
                <label>Transaction ID (Optional)</label>
                <input
                  className="input"
                  type="text"
                  value={paymentData.transactionId}
                  onChange={(e) => setPaymentData({ ...paymentData, transactionId: e.target.value })}
                  placeholder="Enter transaction ID if available"
                />
              </div>
              <div className="flex" style={{ gap: 10 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowPaymentModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={verifyingPayment}>
                  {verifyingPayment ? 'Verifying...' : 'Verify Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {order.status === 'Out for delivery' && order.paymentVerified && !order.deliveryOTPVerified && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3>Verify Delivery OTP</h3>
          <form onSubmit={verifyOtp} className="stack">
            <div className="field">
              <label>Enter OTP from Customer</label>
              <input
                className="input"
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter 6-digit OTP"
                maxLength={6}
                required
              />
            </div>
            <button type="submit" className="btn btn-success btn-block" disabled={verifyingOtp}>
              {verifyingOtp ? 'Verifying...' : 'Confirm Delivery'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

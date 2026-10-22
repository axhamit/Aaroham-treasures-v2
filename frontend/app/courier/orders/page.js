'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function CourierOrders() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'courier')) {
      router.replace('/login?next=/courier/orders');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user?.role === 'courier') {
      fetchOrders();
    }
  }, [user]);

  const fetchOrders = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/courier/orders', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (res.ok) {
        setOrders(await res.json());
      } else {
        toast.error('Failed to fetch orders');
      }
    } catch (err) {
      toast.error('Failed to fetch orders');
    } finally {
      setBusy(false);
    }
  };

  if (loading || !user) return <div className="spinner" />;

  return (
    <div className="container page">
      <div className="section-header">
        <h1>My Orders</h1>
        <Link href="/courier" className="btn btn-secondary">Back to Dashboard</Link>
      </div>

      {busy ? (
        <div className="spinner" />
      ) : orders.length === 0 ? (
        <div className="card center">
          <p className="muted">No orders assigned to you yet.</p>
        </div>
      ) : (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Customer</th>
                <th>Total</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order._id}>
                  <td>{order.orderNumber}</td>
                  <td>{order.user?.name || order.shippingAddress?.fullName}</td>
                  <td>₹{order.totalPrice.toLocaleString()}</td>
                  <td>
                    <span className={`badge ${order.status === 'Delivered' ? 'badge-success' : order.status === 'Out for delivery' ? 'badge-warning' : 'badge-info'}`}>
                      {order.status}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${order.paymentStatus === 'Paid' ? 'badge-success' : 'badge-warning'}`}>
                      {order.paymentStatus}
                    </span>
                  </td>
                  <td>
                    <Link href={`/courier/orders/${order._id}`} className="btn btn-sm btn-primary">
                      View Details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

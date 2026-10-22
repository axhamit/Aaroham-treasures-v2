'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function CourierDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({ total: 0, pending: 0, delivered: 0 });

  useEffect(() => {
    if (!loading && (!user || user.role !== 'courier')) {
      router.replace('/login?next=/courier');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user?.role === 'courier') {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/courier/orders', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (res.ok) {
        const orders = await res.json();
        setStats({
          total: orders.length,
          pending: orders.filter((o) => o.status === 'Out for delivery').length,
          delivered: orders.filter((o) => o.status === 'Delivered').length,
        });
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  if (loading || !user) return <div className="spinner" />;

  return (
    <div className="container page">
      <div className="section-header">
        <h1>Courier Dashboard</h1>
        <p>Welcome, {user.name}</p>
      </div>

      <div className="cards-grid">
        <div className="card">
          <h3>Total Orders</h3>
          <p className="stat-number">{stats.total}</p>
        </div>
        <div className="card">
          <h3>Pending Deliveries</h3>
          <p className="stat-number">{stats.pending}</p>
        </div>
        <div className="card">
          <h3>Delivered Today</h3>
          <p className="stat-number">{stats.delivered}</p>
        </div>
      </div>

      <div className="card" style={{ marginTop: 30 }}>
        <h3>Quick Actions</h3>
        <div className="stack">
          <Link href="/courier/orders" className="btn btn-primary btn-block">
            View My Orders
          </Link>
          <Link href="/courier/profile" className="btn btn-secondary btn-block">
            My Profile
          </Link>
        </div>
      </div>
    </div>
  );
}

'use client';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { LogOut, Package, User, LayoutDashboard } from 'lucide-react';

export default function CourierHeader() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  return (
    <header className="header" style={{ background: 'var(--primary)', color: 'white' }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0' }}>
        <Link href="/courier" className="link" style={{ color: 'white', textDecoration: 'none', fontSize: 20, fontWeight: 'bold' }}>
          Courier Portal
        </Link>
        <nav style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <Link href="/courier" className="link" style={{ color: 'white', display: 'flex', alignItems: 'center', gap: 6 }}>
            <LayoutDashboard size={18} /> Dashboard
          </Link>
          <Link href="/courier/orders" className="link" style={{ color: 'white', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Package size={18} /> Orders
          </Link>
          <Link href="/courier/profile" className="link" style={{ color: 'white', display: 'flex', alignItems: 'center', gap: 6 }}>
            <User size={18} /> Profile
          </Link>
          <button onClick={handleLogout} className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', display: 'flex', alignItems: 'center', gap: 6 }}>
            <LogOut size={18} /> Logout
          </button>
        </nav>
      </div>
    </header>
  );
}

'use client';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

// <Guard>…</Guard> needs login.  <Guard admin>…</Guard> needs the admin role.
export default function Guard({ admin, children }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const path = usePathname();
  useEffect(() => {
    if (loading) return;
    if (!user) router.replace('/login?next=' + encodeURIComponent(path));
    else if (admin && user.role !== 'admin') router.replace('/');
  }, [user, loading, admin, router, path]);
  if (loading || !user || (admin && user.role !== 'admin')) return <div className="spinner" />;
  return children;
}

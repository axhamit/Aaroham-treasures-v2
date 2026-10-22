'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Package, ClipboardList, Users, Palette } from 'lucide-react';
import Guard from '@/components/Guard';

const links = [
  ['/admin', 'Dashboard', LayoutDashboard], ['/admin/products', 'Products', Package], ['/admin/orders', 'Orders', ClipboardList],
  ['/admin/users', 'Customers & admins', Users], ['/admin/settings', 'Store look & feel', Palette],
];

export default function AdminLayout({ children }) {
  const path = usePathname();
  return (
    <Guard admin>
      <div className="admin">
        <aside className="sidebar">
          <h3 className="display">Admin</h3>
          {links.map(([href, label, Icon]) => <Link key={href} href={href} className={path === href ? 'on' : ''}><Icon size={18} />{label}</Link>)}
        </aside>
        <div className="admin-main">{children}</div>
      </div>
    </Guard>
  );
}

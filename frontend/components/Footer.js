'use client';
import Link from 'next/link';
import { useSettings } from '@/context/SettingsContext';

export default function Footer() {
  const { settings } = useSettings();
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div>
          <div className="logo">{settings.storeName}</div>
          <p style={{ marginTop: 10, maxWidth: 340 }}>{settings.tagline}. Every piece is inspected, insured in transit and backed by a 2-year warranty.</p>
        </div>
        <div><h4>Shop</h4><Link href="/products?category=Watches">Watches</Link><Link href="/products?category=Handbags">Handbags</Link><Link href="/products?category=Fragrance">Fragrance</Link><Link href="/products?category=Jewellery">Jewellery</Link></div>
        <div><h4>Account</h4><Link href="/profile">My profile</Link><Link href="/profile?tab=orders">Track an order</Link><Link href="/wishlist">Wishlist</Link><Link href="/cart">Shopping bag</Link></div>
      </div>
      <div className="container small" style={{ marginTop: 40, opacity: .6 }}>© {new Date().getFullYear()} {settings.storeName}. All rights reserved.</div>
    </footer>
  );
}

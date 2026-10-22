'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { ShoppingBag, Heart, User, Menu, X, Search } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useShop } from '@/context/ShopContext';
import { useSettings } from '@/context/SettingsContext';

export default function Header() {
  const { user, logout } = useAuth();
  const { cartCount, wishIds } = useShop();
  const { settings } = useSettings();
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const ref = useRef(null);

  useEffect(() => { setOpen(false); setMenu(false); }, [path]);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setMenu(false); };
    document.addEventListener('click', h);
    return () => document.removeEventListener('click', h);
  }, []);

  const links = [['/products', 'All pieces'], ['/products?category=Watches', 'Watches'], ['/products?category=Handbags', 'Handbags'], ['/products?category=Fragrance', 'Fragrance'], ['/products?category=Jewellery', 'Jewellery']];

  return (
    <>
      {settings.announcement && <div className="announce">{settings.announcement}</div>}
      <header className="header">
        <div className="container header-in">
          <nav className={`nav ${open ? 'open' : ''}`}>
            {links.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}
          </nav>
          <button className="icon-btn menu-btn" aria-label="Menu" onClick={() => setOpen(!open)}>{open ? <X size={22} /> : <Menu size={22} />}</button>
          <Link href="/" className="logo">{settings.storeName}</Link>
          <div className="icons">
            <Link href="/products" className="icon-btn" aria-label="Search"><Search size={20} /></Link>
            <Link href="/wishlist" className="icon-btn" aria-label="Wishlist"><Heart size={20} />{wishIds.length > 0 && <span className="count">{wishIds.length}</span>}</Link>
            <Link href="/cart" className="icon-btn" aria-label="Shopping bag"><ShoppingBag size={20} />{cartCount > 0 && <span className="count">{cartCount}</span>}</Link>
            <div style={{ position: 'relative' }} ref={ref}>
              {user ? (
                <button className="icon-btn" aria-label="Account" aria-expanded={menu} onClick={() => setMenu(!menu)}>
                  {user.avatar ? <img src={user.avatar} alt="" width={28} height={28} style={{ borderRadius: '50%' }} referrerPolicy="no-referrer" /> : <User size={20} />}
                </button>
              ) : (
                <button className="icon-btn" aria-label="Log in or create an account" aria-expanded={menu} onClick={() => setMenu(!menu)}>
                  <User size={20} />
                </button>
              )}
              {menu && (
                <div className="dropdown">
                  {user ? (
                    <>
                      <div style={{ padding: '10px 12px' }}><div>{user.name}</div><div className="small muted">{user.email}</div></div>
                      <Link href="/profile">My profile</Link>
                      <Link href="/profile?tab=orders">My orders</Link>
                      {user.role === 'admin' && <Link href="/admin">Admin panel</Link>}
                      <button onClick={() => { logout(); router.push('/'); }}>Log out</button>
                    </>
                  ) : (
                    <>
                      <Link href="/login">Log in</Link>
                      <Link href="/register">Create account</Link>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
    </>
  );
}

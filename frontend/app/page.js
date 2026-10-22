'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import api, { img } from '@/lib/api';
import { useSettings } from '@/context/SettingsContext';
import ProductCard from '@/components/ProductCard';

export default function Home() {
  const { settings } = useSettings();
  const [featured, setFeatured] = useState([]);
  const [cats, setCats] = useState([]);

  useEffect(() => {
    api.get('/products', { params: { featured: true, limit: 8 } }).then((r) => setFeatured(r.data.items)).catch(() => {});
    api.get('/products/categories').then((r) => setCats(r.data)).catch(() => {});
  }, []);

  const heroImg = settings.heroImage ? img(settings.heroImage) : 'https://picsum.photos/seed/luxe-hero/900/1200';

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <h1 className="display">{settings.heroTitle}</h1>
          <p>{settings.heroSubtitle}</p>
          <div className="row wrap"><Link href="/products" className="btn btn-accent">Shop the collection <ArrowRight size={18} /></Link></div>
        </div>
        <div className="hero-art"><div className="arch"><img src={heroImg} alt="" /></div></div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head"><h2>Shop by category</h2></div>
          <div className="cats">
            {cats.map((c) => <Link key={c} href={`/products?category=${encodeURIComponent(c)}`}>{c}<ArrowRight size={20} /></Link>)}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="section-head"><h2>Chosen this season</h2><Link href="/products" className="link">View all pieces</Link></div>
          <div className="products">{featured.map((p) => <ProductCard key={p._id} p={p} />)}</div>
          {!featured.length && <div className="spinner" />}
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container promises">
          <div><h3>Insured delivery</h3><p className="muted">Every parcel is insured and signed for. Free above {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(settings.freeShippingAbove)}.</p></div>
          <div><h3>Pay how you prefer</h3><p className="muted">Cards, UPI and net banking online, or cash on delivery across India.</p></div>
          <div><h3>Follow your order</h3><p className="muted">See each step from packing to your doorstep on the order page.</p></div>
        </div>
      </section>
    </>
  );
}

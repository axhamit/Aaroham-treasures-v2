'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import Guard from '@/components/Guard';
import ProductCard from '@/components/ProductCard';
import { useShop } from '@/context/ShopContext';

function Wishlist() {
  const [items, setItems] = useState(null);
  const { wishIds } = useShop();
  useEffect(() => { api.get('/me/wishlist').then((r) => setItems(r.data)); }, [wishIds.length]);
  return (
    <div className="container page">
      <h1>Wishlist</h1>
      {!items ? <div className="spinner" /> : items.length ? <div className="products">{items.map((p) => <ProductCard key={p._id} p={p} />)}</div> : (
        <div className="empty"><h3>Nothing saved yet</h3><p className="muted" style={{ marginBottom: 20 }}>Tap the heart on any piece to keep it here.</p><Link href="/products" className="btn btn-primary">Browse the collection</Link></div>
      )}
    </div>
  );
}
export default function WishlistPage() { return <Guard><Wishlist /></Guard>; }

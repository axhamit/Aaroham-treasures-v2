'use client';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import { img, money } from '@/lib/api';
import { useShop } from '@/context/ShopContext';

export default function ProductCard({ p }) {
  const { addToCart, toggleWish, wishIds } = useShop();
  const on = wishIds.includes(p._id);
  const off = p.mrp && p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0;
  return (
    <article className="pcard">
      <Link href={`/products/${p._id}`} className="pimg">
        {p.images?.[0] && <img src={img(p.images[0])} alt={p.name} loading="lazy" />}
        {off > 0 && <span className="tag">{off}% off</span>}
      </Link>
      <button className={`wish ${on ? 'on' : ''}`} onClick={() => toggleWish(p)} aria-label={on ? 'Remove from wishlist' : 'Add to wishlist'}>
        <Heart size={18} fill={on ? 'currentColor' : 'none'} />
      </button>
      <div className="pbody">
        <span className="brand">{p.brand}</span>
        <Link href={`/products/${p._id}`} className="name">{p.name}</Link>
        <div className="price"><span className="now">{money(p.price)}</span>{off > 0 && <span className="was">{money(p.mrp)}</span>}</div>
      </div>
      <button className="btn btn-outline btn-sm btn-block" disabled={p.stock < 1} onClick={() => addToCart(p)}>{p.stock < 1 ? 'Sold out' : 'Add to bag'}</button>
    </article>
  );
}

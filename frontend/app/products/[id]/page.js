'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Heart, Minus, Plus } from 'lucide-react';
import api, { img, money } from '@/lib/api';
import { useShop } from '@/context/ShopContext';

export default function ProductPage() {
  const { id } = useParams();
  const { addToCart, toggleWish, wishIds } = useShop();
  const [p, setP] = useState(null);
  const [err, setErr] = useState(false);
  const [i, setI] = useState(0);
  const [qty, setQty] = useState(1);

  useEffect(() => { api.get(`/products/${id}`).then((r) => setP(r.data)).catch(() => setErr(true)); }, [id]);

  if (err) return <div className="container page"><div className="empty"><h3>This piece is no longer available</h3></div></div>;
  if (!p) return <div className="spinner" />;
  const off = p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0;
  const on = wishIds.includes(p._id);

  return (
    <div className="container page">
      <div className="detail">
        <div className="gallery">
          <div className="main">{p.images[i] && <img src={img(p.images[i])} alt={p.name} />}</div>
          {p.images.length > 1 && <div className="thumbs">{p.images.map((x, n) => <button key={n} className={n === i ? 'on' : ''} onClick={() => setI(n)} aria-label={`Image ${n + 1}`}><img src={img(x)} alt="" /></button>)}</div>}
        </div>
        <div className="stack">
          <span className="muted">{p.brand} · {p.category}</span>
          <h1 style={{ margin: 0 }}>{p.name}</h1>
          <div className="price" style={{ fontSize: 22 }}>
            <span className="now">{money(p.price)}</span>
            {off > 0 && <><span className="was">{money(p.mrp)}</span><span className="badge good">{off}% off</span></>}
          </div>
          <p className="muted small">Inclusive of all taxes.</p>
          <p style={{ maxWidth: '60ch' }}>{p.description}</p>
          <p className="small">{p.stock < 1 ? <span style={{ color: 'var(--danger)' }}>Sold out</span> : p.stock <= 5 ? <span style={{ color: 'var(--danger)' }}>Only {p.stock} left</span> : 'In stock, dispatched within 2 working days'}</p>
          <div className="row wrap">
            <div className="qty">
              <button onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Decrease"><Minus size={16} /></button>
              <span>{qty}</span>
              <button onClick={() => setQty(Math.min(p.stock || 1, qty + 1))} aria-label="Increase"><Plus size={16} /></button>
            </div>
            <button className="btn btn-primary" style={{ flex: 1, minWidth: 180 }} disabled={p.stock < 1} onClick={() => addToCart(p, qty)}>Add to bag</button>
            <button className="btn btn-outline" onClick={() => toggleWish(p)}><Heart size={18} fill={on ? 'currentColor' : 'none'} />{on ? 'Saved' : 'Save'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

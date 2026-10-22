'use client';
import Link from 'next/link';
import { Minus, Plus, Trash2 } from 'lucide-react';
import Guard from '@/components/Guard';
import { useShop } from '@/context/ShopContext';
import { useSettings } from '@/context/SettingsContext';
import { img, money } from '@/lib/api';

function Cart() {
  const { cart, cartTotal, setQty, removeItem } = useShop();
  const { settings } = useSettings();
  const shipping = cartTotal >= settings.freeShippingAbove || !cart.length ? 0 : settings.shippingFee;

  if (!cart.length) return (
    <div className="container page"><h1>Your bag</h1>
      <div className="empty"><h3>Your bag is empty</h3><p className="muted" style={{ marginBottom: 20 }}>Pieces you add will wait here for you.</p><Link href="/products" className="btn btn-primary">Browse the collection</Link></div>
    </div>
  );
  return (
    <div className="container page">
      <h1>Your bag</h1>
      <div className="layout2">
        <div className="card" style={{ padding: '8px 24px' }}>
          {cart.map(({ product: p, qty }) => (
            <div className="line-item" key={p._id}>
              <Link href={`/products/${p._id}`}><img src={img(p.images[0])} alt={p.name} /></Link>
              <div className="stack" style={{ gap: 4 }}>
                <span className="muted small">{p.brand}</span>
                <Link href={`/products/${p._id}`} className="display" style={{ fontSize: 20 }}>{p.name}</Link>
                <span>{money(p.price)}</span>
                <div className="row" style={{ marginTop: 8 }}>
                  <div className="qty">
                    <button onClick={() => setQty(p._id, qty - 1)} disabled={qty <= 1} aria-label="Decrease"><Minus size={14} /></button>
                    <span>{qty}</span>
                    <button onClick={() => setQty(p._id, qty + 1)} disabled={qty >= p.stock} aria-label="Increase"><Plus size={14} /></button>
                  </div>
                  <button className="small muted row" onClick={() => removeItem(p._id)}><Trash2 size={15} /> Remove</button>
                </div>
              </div>
              <strong>{money(p.price * qty)}</strong>
            </div>
          ))}
        </div>
        <aside className="card">
          <h3 style={{ fontSize: 24, marginBottom: 12 }}>Order summary</h3>
          <div className="sum-row"><span>Subtotal</span><span>{money(cartTotal)}</span></div>
          <div className="sum-row"><span>Shipping</span><span>{shipping ? money(shipping) : 'Free'}</span></div>
          <div className="sum-row total"><span>Total</span><span>{money(cartTotal + shipping)}</span></div>
          {shipping > 0 && <p className="small muted" style={{ marginTop: 8 }}>Add {money(settings.freeShippingAbove - cartTotal)} more for free shipping.</p>}
          <Link href="/checkout" className="btn btn-primary btn-block" style={{ marginTop: 18 }}>Continue to checkout</Link>
        </aside>
      </div>
    </div>
  );
}
export default function CartPage() { return <Guard><Cart /></Guard>; }

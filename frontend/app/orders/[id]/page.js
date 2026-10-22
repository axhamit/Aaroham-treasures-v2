'use client';
import { Suspense, useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import Guard from '@/components/Guard';
import OrderTimeline from '@/components/OrderTimeline';
import api, { errMsg, fmtDateTime, img, money } from '@/lib/api';
import { startPayment } from '@/lib/pay';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';

function Order() {
  const { id } = useParams();
  const placed = useSearchParams().get('placed');
  const { user } = useAuth();
  const { settings } = useSettings();
  const [o, setO] = useState(null);
  const load = useCallback(() => api.get(`/orders/${id}`).then((r) => setO(r.data)).catch(() => setO(false)), [id]);
  useEffect(() => { load(); }, [load]);

  if (o === false) return <div className="container page"><div className="empty"><h3>Order not found</h3></div></div>;
  if (!o) return <div className="spinner" />;
  const a = o.shippingAddress;
  const canCancel = ['Placed', 'Confirmed', 'Packed'].includes(o.status);
  const needsPay = o.paymentMethod === 'ONLINE' && o.paymentStatus !== 'Paid' && o.status !== 'Cancelled';

  const cancel = async () => {
    if (!confirm('Cancel this order?')) return;
    try { setO((await api.put(`/orders/${id}/cancel`)).data); toast.success('Order cancelled'); } catch (e) { toast.error(errMsg(e)); }
  };
  const pay = async () => {
    try { const { data } = await api.post(`/orders/${id}/pay`); await startPayment({ ...data, user, storeName: settings.storeName, onDone: load }); } catch (e) { toast.error(errMsg(e)); }
  };

  return (
    <div className="container page">
      {placed && <div className="card" style={{ marginBottom: 24, borderColor: 'var(--accent)' }}><h3 style={{ fontSize: 24 }}>Thank you, your order is placed</h3><p className="muted">We have sent it to our atelier team. You can follow every step below.</p></div>}
      <div className="row between wrap"><h1 style={{ marginBottom: 8 }}>Order {o.orderNumber}</h1><span className={`badge ${o.status === 'Cancelled' ? 'bad' : o.status === 'Delivered' ? 'good' : ''}`}>{o.status}</span></div>
      <p className="muted" style={{ marginBottom: 28 }}>Placed on {fmtDateTime(o.createdAt)}</p>
      <div className="layout2">
        <div className="stack" style={{ gap: 24 }}>
          <section className="card"><h3 style={{ fontSize: 22, marginBottom: 14 }}>Tracking</h3><OrderTimeline order={o} /></section>
          <section className="card" style={{ padding: '8px 24px' }}>
            {o.items.map((i, n) => (
              <div className="line-item" key={n}>
                <img src={img(i.image)} alt="" />
                <div><Link href={`/products/${i.product}`} className="display" style={{ fontSize: 19 }}>{i.name}</Link><div className="muted small">Qty {i.qty} × {money(i.price)}</div></div>
                <strong>{money(i.price * i.qty)}</strong>
              </div>
            ))}
          </section>
        </div>
        <aside className="stack">
          <section className="card">
            <h3 style={{ fontSize: 22, marginBottom: 10 }}>Summary</h3>
            <div className="sum-row"><span>Subtotal</span><span>{money(o.itemsPrice)}</span></div>
            <div className="sum-row"><span>Shipping</span><span>{o.shippingPrice ? money(o.shippingPrice) : 'Free'}</span></div>
            <div className="sum-row total"><span>Total</span><span>{money(o.totalPrice)}</span></div>
            <p className="small muted" style={{ marginTop: 10 }}>{o.paymentMethod === 'COD' ? 'Cash on delivery' : 'Online payment'} · <span className={`badge ${o.paymentStatus === 'Paid' ? 'good' : 'warn'}`}>{o.paymentStatus}</span></p>
            {needsPay && <button className="btn btn-accent btn-block" style={{ marginTop: 14 }} onClick={pay}>Pay now</button>}
            {canCancel && <button className="btn btn-danger btn-block" style={{ marginTop: 10 }} onClick={cancel}>Cancel order</button>}
          </section>
          <section className="card">
            <h3 style={{ fontSize: 22, marginBottom: 10 }}>Delivering to</h3>
            <p>{a.fullName}</p>
            <p className="muted small">{a.line1}{a.line2 ? ', ' + a.line2 : ''}<br />{a.city}, {a.state} {a.pincode}<br />{a.phone}</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
export default function OrderPage() { return <Guard><Suspense fallback={<div className="spinner" />}><Order /></Suspense></Guard>; }

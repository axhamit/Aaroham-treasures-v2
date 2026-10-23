'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { MapPin } from 'lucide-react';
import Guard from '@/components/Guard';
import AddressForm from '@/components/AddressForm';
import api, { errMsg, img, money } from '@/lib/api';
import { useShop } from '@/context/ShopContext';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { startPayment } from '@/lib/pay';

function Checkout() {
  const { cart, cartTotal, refresh } = useShop();
  const { user } = useAuth();
  const { settings } = useSettings();
  const router = useRouter();
  const [addresses, setAddresses] = useState(null);
  const [sel, setSel] = useState('');
  const [adding, setAdding] = useState(false);
  const [method, setMethod] = useState('COD');
  const [busy, setBusy] = useState(false);

  const shipping = cartTotal >= settings.freeShippingAbove ? 0 : settings.shippingFee;

  useEffect(() => {
    api.get('/me/addresses').then((r) => {
      setAddresses(r.data);
      const d = r.data.find((a) => a.isDefault) || r.data[0];
      if (d) setSel(d._id); else setAdding(true);
    });
  }, []);

  const saveAddress = async (f) => {
    setBusy(true);
    try {
      const { data } = await api.post('/me/addresses', f);
      setAddresses(data); setSel(data[data.length - 1]._id); setAdding(false); toast.success('Address saved');
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  const place = async () => {
    if (!sel) return toast.error('Choose a delivery address');
    setBusy(true);
    try {
      const { data } = await api.post('/orders', { addressId: sel, paymentMethod: method });
      const go = async () => { await refresh(); router.push(`/orders/${data.order._id}?placed=1`); };
      if (method === 'COD') {
        if (data.delivery?.success === false) {
          toast.error(`Order placed, but Delhivery shipment needs attention: ${data.delivery.message}`);
        }
        return go();
      }
      await startPayment({ order: data.order, razorpay: data.razorpay, demoPayment: data.demoPayment, user, storeName: settings.storeName, onDone: go });
    } catch (e) { toast.error(errMsg(e)); setBusy(false); }
  };

  if (!cart.length && !busy) return <div className="container page"><div className="empty"><h3>Your bag is empty</h3></div></div>;
  if (!addresses) return <div className="spinner" />;

  return (
    <div className="container page">
      <h1>Checkout</h1>
      <div className="layout2">
        <div className="stack" style={{ gap: 28 }}>
          <section className="card">
            <div className="row between" style={{ marginBottom: 16 }}><h3 style={{ fontSize: 24 }}>Delivery address</h3>{!adding && <button className="link small" onClick={() => setAdding(true)}>Add a new address</button>}</div>
            {adding ? <AddressForm onSave={saveAddress} onCancel={addresses.length ? () => setAdding(false) : null} busy={busy} /> : (
              <div className="stack">
                {addresses.map((a) => (
                  <label key={a._id} className={`choice ${sel === a._id ? 'on' : ''}`}>
                    <input type="radio" name="addr" checked={sel === a._id} onChange={() => setSel(a._id)} />
                    <div>
                      <strong>{a.fullName}</strong> <span className="badge">{a.label}</span> {a.lat && <span className="badge good"><MapPin size={11} style={{ display: 'inline' }} /> pinned</span>}
                      <div className="muted small">{a.line1}{a.line2 ? ', ' + a.line2 : ''}, {a.city}, {a.state} {a.pincode}</div>
                      <div className="muted small">{a.phone}</div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </section>
          <section className="card">
            <h3 style={{ fontSize: 24, marginBottom: 16 }}>Payment</h3>
            <div className="stack">
              <label className={`choice ${method === 'COD' ? 'on' : ''}`}><input type="radio" checked={method === 'COD'} onChange={() => setMethod('COD')} /><div><strong>Cash on delivery</strong><div className="muted small">Pay when the parcel arrives.</div></div></label>
              <label className={`choice ${method === 'ONLINE' ? 'on' : ''}`}><input type="radio" checked={method === 'ONLINE'} onChange={() => setMethod('ONLINE')} /><div><strong>Pay online</strong><div className="muted small">UPI, cards and net banking through Razorpay.</div></div></label>
            </div>
          </section>
        </div>
        <aside className="card">
          <h3 style={{ fontSize: 24, marginBottom: 8 }}>In your bag</h3>
          {cart.map(({ product: p, qty }) => (
            <div key={p._id} className="row" style={{ padding: '10px 0', alignItems: 'start' }}>
              <img src={img(p.images[0])} alt="" width={52} height={64} style={{ objectFit: 'cover' }} />
              <div style={{ flex: 1 }}><div className="small">{p.name}</div><div className="muted small">Qty {qty}</div></div>
              <span className="small">{money(p.price * qty)}</span>
            </div>
          ))}
          <div className="sum-row" style={{ marginTop: 8 }}><span>Subtotal</span><span>{money(cartTotal)}</span></div>
          <div className="sum-row"><span>Shipping</span><span>{shipping ? money(shipping) : 'Free'}</span></div>
          <div className="sum-row total"><span>Total</span><span>{money(cartTotal + shipping)}</span></div>
          <button className="btn btn-primary btn-block" style={{ marginTop: 18 }} disabled={busy || adding} onClick={place}>
            {busy ? 'Please wait…' : method === 'COD' ? 'Place order' : `Pay ${money(cartTotal + shipping)}`}
          </button>
        </aside>
      </div>
    </div>
  );
}
export default function CheckoutPage() { return <Guard><Checkout /></Guard>; }

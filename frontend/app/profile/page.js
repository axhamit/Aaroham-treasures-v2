'use client';
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import Guard from '@/components/Guard';
import AddressForm from '@/components/AddressForm';
import api, { errMsg, fmtDate, img, money } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

const statusClass = (s) => (s === 'Delivered' ? 'good' : s === 'Cancelled' ? 'bad' : '');

function Profile() {
  const { user, setUser } = useAuth();
  const router = useRouter();
  const tab = useSearchParams().get('tab') || 'orders';
  const [orders, setOrders] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [editing, setEditing] = useState(null); // null | 'new' | address
  const [form, setForm] = useState({ name: user.name, phone: user.phone || '' });
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get('/orders/mine').then((r) => setOrders(r.data));
    api.get('/me/addresses').then((r) => setAddresses(r.data));
  }, []);

  const go = (t) => router.replace('/profile?tab=' + t);
  const active = (orders || []).filter((o) => o.status !== 'Cancelled');
  const spent = active.reduce((s, o) => s + o.totalPrice, 0);

  const saveProfile = async (e) => {
    e.preventDefault(); setBusy(true);
    try { setUser((await api.put('/me', form)).data.user); toast.success('Profile updated'); } catch (er) { toast.error(errMsg(er)); } finally { setBusy(false); }
  };
  const savePw = async (e) => {
    e.preventDefault();
    try { await api.put('/me/password', pw); setPw({ currentPassword: '', newPassword: '' }); toast.success('Password updated'); } catch (er) { toast.error(errMsg(er)); }
  };
  const saveAddress = async (f) => {
    setBusy(true);
    try {
      const { data } = f._id ? await api.put(`/me/addresses/${f._id}`, f) : await api.post('/me/addresses', f);
      setAddresses(data); setEditing(null); toast.success('Address saved');
    } catch (er) { toast.error(errMsg(er)); } finally { setBusy(false); }
  };
  const delAddress = async (id) => { try { setAddresses((await api.delete(`/me/addresses/${id}`)).data); } catch (er) { toast.error(errMsg(er)); } };

  return (
    <div className="container page">
      <div className="row" style={{ marginBottom: 28, gap: 18 }}>
        {user.avatar ? <img src={user.avatar} alt="" width={64} height={64} style={{ borderRadius: '50%' }} referrerPolicy="no-referrer" /> : <div className="icon-btn" style={{ width: 64, height: 64, background: 'var(--primary)', color: '#fff', fontSize: 26 }}>{user.name[0]}</div>}
        <div><h1 style={{ margin: 0, fontSize: 36 }}>{user.name}</h1><p className="muted">{user.email}</p></div>
      </div>
      <div className="tabs">
        {[['orders', 'Orders'], ['addresses', 'Addresses'], ['details', 'Account details']].map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => go(k)}>{l}</button>)}
      </div>

      {tab === 'orders' && (
        <>
          <div className="stats">
            <div className="stat"><div className="muted small">Orders placed</div><div className="v">{orders ? orders.length : '–'}</div></div>
            <div className="stat"><div className="muted small">Total spent</div><div className="v">{money(spent)}</div></div>
            <div className="stat"><div className="muted small">On the way</div><div className="v">{orders ? active.filter((o) => !['Delivered'].includes(o.status)).length : '–'}</div></div>
            <div className="stat"><div className="muted small">Delivered</div><div className="v">{orders ? active.filter((o) => o.status === 'Delivered').length : '–'}</div></div>
          </div>
          {!orders ? <div className="spinner" /> : orders.length ? (
            <div className="card" style={{ padding: '0 24px' }}>
              {orders.map((o) => (
                <div className="order-row" key={o._id}>
                  <div><Link href={`/orders/${o._id}`} className="link">{o.orderNumber}</Link><div className="muted small">{fmtDate(o.createdAt)} · {o.items.reduce((s, i) => s + i.qty, 0)} items</div></div>
                  <div className="thumbstrip">{o.items.slice(0, 4).map((i, n) => <img key={n} src={img(i.image)} alt="" />)}</div>
                  <div><div>{money(o.totalPrice)}</div><div className="muted small">{o.paymentMethod === 'COD' ? 'Cash on delivery' : 'Online'} · {o.paymentStatus}</div></div>
                  <div className="row"><span className={`badge ${statusClass(o.status)}`}>{o.status}</span><Link href={`/orders/${o._id}`} className="btn btn-outline btn-sm">Track</Link></div>
                </div>
              ))}
            </div>
          ) : <div className="empty"><h3>No orders yet</h3><p className="muted" style={{ marginBottom: 20 }}>Your orders and their tracking will appear here.</p><Link href="/products" className="btn btn-primary">Start shopping</Link></div>}
        </>
      )}

      {tab === 'addresses' && (
        editing ? <div className="card" style={{ maxWidth: 720 }}><h3 style={{ fontSize: 24, marginBottom: 16 }}>{editing === 'new' ? 'New address' : 'Edit address'}</h3><AddressForm initial={editing === 'new' ? null : editing} onSave={(f) => saveAddress(editing === 'new' ? f : { ...f, _id: editing._id })} onCancel={() => setEditing(null)} busy={busy} /></div> : (
          <div className="stack">
            <div className="products" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))' }}>
              {addresses.map((a) => (
                <div className="card" key={a._id}>
                  <div className="row between"><strong>{a.fullName}</strong><span className="row"><span className="badge">{a.label}</span>{a.isDefault && <span className="badge good">Default</span>}</span></div>
                  <p className="muted small" style={{ margin: '8px 0 14px' }}>{a.line1}{a.line2 ? ', ' + a.line2 : ''}<br />{a.city}, {a.state} {a.pincode}<br />{a.phone}{a.lat ? <><br />Location pinned</> : null}</p>
                  <div className="row"><button className="btn btn-outline btn-sm" onClick={() => setEditing(a)}>Edit</button><button className="btn btn-danger btn-sm" onClick={() => delAddress(a._id)}>Delete</button></div>
                </div>
              ))}
            </div>
            <div><button className="btn btn-primary" onClick={() => setEditing('new')}>Add an address</button></div>
          </div>
        )
      )}

      {tab === 'details' && (
        <div className="grid2" style={{ alignItems: 'start', maxWidth: 900 }}>
          <form className="card stack" onSubmit={saveProfile}>
            <h3 style={{ fontSize: 24 }}>Your details</h3>
            <div className="field"><label>Name</label><input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="field"><label>Email</label><input className="input" disabled value={user.email} /></div>
            <div className="field"><label>Phone</label><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <button className="btn btn-primary" disabled={busy}>Save changes</button>
          </form>
          <form className="card stack" onSubmit={savePw}>
            <h3 style={{ fontSize: 24 }}>Password</h3>
            <div className="field"><label>Current password (leave empty if you signed up with Google)</label><input className="input" type="password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} /></div>
            <div className="field"><label>New password</label><input className="input" type="password" minLength={8} required value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} /></div>
            <button className="btn btn-outline">Update password</button>
          </form>
        </div>
      )}
    </div>
  );
}
export default function ProfilePage() { return <Guard><Suspense fallback={<div className="spinner" />}><Profile /></Suspense></Guard>; }

'use client';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { UserPlus } from 'lucide-react';
import api, { errMsg, fmtDate, fmtDateTime, money } from '@/lib/api';
import Modal from '@/components/Modal';
import { useAuth } from '@/context/AuthContext';

export default function AdminUsers() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState(null);
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'admin', vehicleNumber: '', vehicleType: 'Bike' });
  const [view, setView] = useState(null);
  const [orders, setOrders] = useState([]);

  const load = () => api.get('/admin/users', { params: { q, role } }).then((r) => setUsers(r.data));
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [role]);

  const patch = async (u, body) => {
    try { await api.put(`/admin/users/${u.id}`, body); toast.success('Updated'); load(); } catch (e) { toast.error(errMsg(e)); }
  };
  const create = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form };
      if (form.role !== 'courier') {
        delete payload.vehicleNumber;
        delete payload.vehicleType;
      }
      await api.post('/admin/users', payload);
      toast.success('Profile created');
      setAdding(false);
      setForm({ name: '', email: '', password: '', role: 'admin', vehicleNumber: '', vehicleType: 'Bike' });
      load();
    } catch (er) { toast.error(errMsg(er)); }
  };
  const open = async (u) => { setView(u); setOrders([]); setOrders((await api.get(`/admin/users/${u.id}/orders`)).data); };

  return (
    <>
      <div className="row between wrap" style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0 }}>Customers and admins</h1>
        <button className="btn btn-primary" onClick={() => setAdding(true)}><UserPlus size={18} />Add profile</button>
      </div>
      <form className="filters" onSubmit={(e) => { e.preventDefault(); load(); }}>
        <input className="input" style={{ minWidth: 260 }} placeholder="Search name or email" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input" value={role} onChange={(e) => setRole(e.target.value)}><option value="">Everyone</option><option value="customer">Customers</option><option value="admin">Admins</option><option value="courier">Couriers</option></select>
        <button className="btn btn-outline">Search</button>
      </form>

      {!users ? <div className="spinner" /> : (
        <div className="table-wrap"><table>
          <thead><tr><th>Name</th><th>Joined</th><th>Orders</th><th>Spent</th><th>Role</th><th>Access</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td><button style={{ textAlign: 'left' }} onClick={() => open(u)}><strong className="link">{u.name}</strong><div className="muted small">{u.email}</div></button></td>
                <td>{fmtDate(u.createdAt)}</td><td>{u.orders}</td><td>{money(u.spent)}</td>
                <td><select className="input" style={{ padding: '6px 8px', width: 120 }} value={u.role} disabled={u.id === me.id} onChange={(e) => patch(u, { role: e.target.value })}><option value="customer">Customer</option><option value="admin">Admin</option><option value="courier">Courier</option></select></td>
                <td>{u.id === me.id ? <span className="muted small">You</span> : <button className={`btn btn-sm ${u.isBlocked ? 'btn-primary' : 'btn-danger'}`} onClick={() => patch(u, { isBlocked: !u.isBlocked })}>{u.isBlocked ? 'Unblock' : 'Block'}</button>}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}

      {adding && (
        <Modal title="Add a profile" onClose={() => setAdding(false)}>
          <form className="stack" onSubmit={create}>
            <div className="field"><label>Full name</label><input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="field"><label>Email</label><input className="input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="grid2">
              <div className="field"><label>Temporary password (8+ characters)</label><input className="input" type="password" minLength={8} required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
              <div className="field"><label>Role</label><select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option value="admin">Admin</option><option value="customer">Customer</option><option value="courier">Courier</option></select></div>
            </div>
            {form.role === 'courier' && (
              <>
                <div className="field"><label>Vehicle Number</label><input className="input" value={form.vehicleNumber} onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value })} placeholder="e.g., MH-12-AB-1234" /></div>
                <div className="field"><label>Vehicle Type</label><select className="input" value={form.vehicleType} onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}><option value="Bike">Bike</option><option value="Scooter">Scooter</option><option value="Van">Van</option><option value="Truck">Truck</option></select></div>
              </>
            )}
            <button className="btn btn-primary">Create profile</button>
          </form>
        </Modal>
      )}

      {view && (
        <Modal title={view.name} onClose={() => setView(null)}>
          <p className="muted" style={{ marginBottom: 16 }}>{view.email} · {view.orders} orders · {money(view.spent)} spent</p>
          <div className="table-wrap"><table><tbody>
            {orders.map((o) => <tr key={o._id}><td><strong>{o.orderNumber}</strong><div className="muted small">{fmtDateTime(o.createdAt)}</div></td><td>{money(o.totalPrice)}</td><td>{o.paymentMethod}</td><td><span className="badge">{o.status}</span></td></tr>)}
            {!orders.length && <tr><td className="muted">No orders</td></tr>}
          </tbody></table></div>
        </Modal>
      )}
    </>
  );
}

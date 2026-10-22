'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import api, { fmtDate, money } from '@/lib/api';

const statusClass = (s) => (s === 'Delivered' ? 'good' : s === 'Cancelled' ? 'bad' : s === 'Placed' ? 'warn' : '');

export default function Dashboard() {
  const [s, setS] = useState(null);
  useEffect(() => { api.get('/admin/stats').then((r) => setS(r.data)); }, []);
  if (!s) return <div className="spinner" />;
  const max = Math.max(...s.series.map((d) => d.revenue), 1);

  return (
    <>
      <h1>Dashboard</h1>
      <div className="stats">
        <div className="stat"><div className="muted small">Revenue (paid)</div><div className="v">{money(s.revenue)}</div></div>
        <div className="stat"><div className="muted small">Orders</div><div className="v">{s.orders}</div></div>
        <div className="stat"><div className="muted small">Need action</div><div className="v">{s.pending}</div></div>
        <div className="stat"><div className="muted small">Customers</div><div className="v">{s.customers}</div></div>
        <div className="stat"><div className="muted small">Products</div><div className="v">{s.products}</div></div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="row between"><h3 style={{ fontSize: 22 }}>Sales, last 14 days</h3><span className="muted small">Total {money(s.series.reduce((t, d) => t + d.revenue, 0))}</span></div>
        <div className="bars" style={{ marginTop: 20 }}>
          {s.series.map((d) => <div key={d.date} className="bar" style={{ height: `${(d.revenue / max) * 100}%` }} title={`${fmtDate(d.date)}: ${money(d.revenue)} from ${d.orders} orders`} />)}
        </div>
        <div className="bar-labels">{s.series.map((d) => <span key={d.date}>{d.date.slice(8)}</span>)}</div>
      </div>

      <div className="grid2" style={{ alignItems: 'start' }}>
        <div>
          <div className="row between" style={{ marginBottom: 10 }}><h3 style={{ fontSize: 22 }}>Latest orders</h3><Link href="/admin/orders" className="link small">All orders</Link></div>
          <div className="table-wrap"><table><tbody>
            {s.recent.map((o) => <tr key={o._id}><td><strong>{o.orderNumber}</strong><div className="muted small">{o.user?.name}</div></td><td>{money(o.totalPrice)}</td><td><span className={`badge ${statusClass(o.status)}`}>{o.status}</span></td></tr>)}
            {!s.recent.length && <tr><td className="muted">No orders yet</td></tr>}
          </tbody></table></div>
        </div>
        <div>
          <div className="row between" style={{ marginBottom: 10 }}><h3 style={{ fontSize: 22 }}>Running low</h3><Link href="/admin/products" className="link small">Manage stock</Link></div>
          <div className="table-wrap"><table><tbody>
            {s.lowStock.map((p) => <tr key={p._id}><td>{p.name}</td><td><span className={`badge ${p.stock === 0 ? 'bad' : 'warn'}`}>{p.stock === 0 ? 'Sold out' : `${p.stock} left`}</span></td></tr>)}
            {!s.lowStock.length && <tr><td className="muted">All products are well stocked</td></tr>}
          </tbody></table></div>
        </div>
      </div>
    </>
  );
}

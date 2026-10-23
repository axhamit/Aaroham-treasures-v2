'use client';
import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Ban, Download, Printer, RefreshCw } from 'lucide-react';
import api, { errMsg, fmtDateTime, img, money } from '@/lib/api';
import Modal from '@/components/Modal';
import OrderTimeline from '@/components/OrderTimeline';

const STATUSES = ['Placed', 'Confirmed', 'Packed', 'Shipped', 'Out for delivery', 'Delivered', 'Cancelled'];
const cls = (s) => (s === 'Delivered' ? 'good' : s === 'Cancelled' ? 'bad' : s === 'Placed' ? 'warn' : '');
const shipmentErrorMessage = (error) => {
  const data = error?.response?.data;
  const detail = data?.details || data?.errors || data?.error;
  const detailText = typeof detail === 'string'
    ? detail
    : Array.isArray(detail)
      ? detail.map((item) => typeof item === 'string' ? item : JSON.stringify(item)).join('; ')
      : detail && typeof detail === 'object'
        ? JSON.stringify(detail)
        : '';
  const message = data?.message || error?.message || 'Failed to create shipment';
  return detailText && detailText !== message ? `${message}: ${detailText}` : message;
};

export default function AdminOrders() {
  const [f, setF] = useState({ q: '', status: '', payment: '', from: '', to: '' });
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(null);
  const [upd, setUpd] = useState({ status: '', note: '', courier: '', trackingNumber: '' });
  const [creatingShipment, setCreatingShipment] = useState(false);
  const [trackingShipment, setTrackingShipment] = useState(false);

  const load = useCallback(() => api.get('/admin/orders', { params: { ...f, page } }).then((r) => setData(r.data)), [f, page]);

  useEffect(() => { load(); }, [load]);

  const select = (o) => {
    setOpen(o);
    setUpd({ status: o.status, note: '', courier: o.courier || '', trackingNumber: o.trackingNumber || '' });
  };

  const save = async () => {
    try {
      const { data: o } = await api.put(`/admin/orders/${open._id}/status`, upd);
      setOpen(o); setUpd({ ...upd, note: '' }); toast.success('Order updated'); load();
    } catch (e) { toast.error(errMsg(e)); }
  };

  const createDelhiveryShipment = async () => {
    if (!open || creatingShipment) return;
    setCreatingShipment(true);
    try {
      const { data: result } = await api.post(`/delhivery/orders/${open._id}/create-shipment`);
      setOpen((current) => ({ ...current, ...result.order, user: current.user }));
      setUpd((current) => ({ ...current, courier: 'Delhivery', trackingNumber: result.waybill }));
      toast.success(result.message);
      load();
    } catch (e) {
      toast.error(shipmentErrorMessage(e));
    } finally {
      setCreatingShipment(false);
    }
  };

  const confirmShiprocketCancellation = async () => {
    if (!open || !window.confirm('Confirm that you already cancelled this order in Shiprocket?')) return;
    try {
      const { data: result } = await api.post(`/shiprocket/orders/${open._id}/confirm-cancellation`, { confirmedCancellation: true });
      setOpen((current) => ({ ...current, ...result.order, user: current.user }));
      toast.success(result.message);
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const refreshDelhiveryTracking = async () => {
    if (!open || trackingShipment) return;
    setTrackingShipment(true);
    try {
      const { data: result } = await api.get(`/delhivery/orders/${open._id}/track`);
      setOpen((current) => ({ ...current, ...result.order, user: current.user }));
      setUpd((current) => ({ ...current, status: result.order.status }));
      toast.success('Delhivery tracking updated');
      load();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setTrackingShipment(false);
    }
  };

  const downloadLabel = async () => {
    try {
      const { data: file } = await api.get(`/delhivery/orders/${open._id}/label`, { responseType: 'blob' });
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = `label-${open.orderNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const cancelDelhiveryShipment = async () => {
    if (!open || !window.confirm('Cancel this Delhivery shipment?')) return;
    try {
      const { data: result } = await api.post(`/delhivery/orders/${open._id}/cancel-shipment`);
      setOpen((current) => ({ ...current, ...result.order, user: current.user }));
      toast.success('Delhivery shipment cancelled');
      load();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const reconcileDelhiveryShipment = async () => {
    if (!open || !window.confirm('Check your Delhivery account first. Confirm that no shipment was created for this order?')) return;
    try {
      const { data: result } = await api.post(`/delhivery/orders/${open._id}/reconcile-shipment`, { confirmedNoShipment: true });
      setOpen((current) => ({ ...current, ...result.order, user: current.user }));
      toast.success('You can now retry shipment creation');
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  // download with the auth header, then save the blob as a file
  const exportFile = async (format) => {
    try {
      const res = await api.get('/admin/orders/export', { params: { ...f, format }, responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url; a.download = `orders-${new Date().toISOString().slice(0, 10)}.${format}`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { toast.error('Export failed'); }
  };

  const set = (k) => (e) => { setPage(1); setF({ ...f, [k]: e.target.value }); };

  return (
    <>
      <div className="row between wrap" style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0 }}>Orders</h1>
        <div className="row"><button className="btn btn-outline" onClick={() => exportFile('xlsx')}><Download size={16} />Excel</button><button className="btn btn-outline" onClick={() => exportFile('csv')}><Download size={16} />CSV</button></div>
      </div>
      <div className="filters">
        <input className="input" style={{ minWidth: 240 }} placeholder="Order no., customer name or email" value={f.q} onChange={set('q')} />
        <select className="input" value={f.status} onChange={set('status')}><option value="">All statuses</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
        <select className="input" value={f.payment} onChange={set('payment')}><option value="">All payments</option><option value="COD">Cash on delivery</option><option value="ONLINE">Online</option></select>
        <input className="input" type="date" value={f.from} onChange={set('from')} aria-label="From date" />
        <input className="input" type="date" value={f.to} onChange={set('to')} aria-label="To date" />
      </div>
      <p className="muted small" style={{ marginBottom: 10 }}>Exports follow the filters above.</p>

      {!data ? <div className="spinner" /> : (
        <>
          <div className="table-wrap"><table>
            <thead><tr><th>Order</th><th>Date</th><th>Customer</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th></tr></thead>
            <tbody>
              {data.items.map((o) => (
                <tr key={o._id} className="click" onClick={() => select(o)}>
                  <td><strong>{o.orderNumber}</strong></td>
                  <td>{fmtDateTime(o.createdAt)}</td>
                  <td>{o.user?.name || o.shippingAddress.fullName}<div className="muted small">{o.shippingAddress.city}</div></td>
                  <td>{o.items.reduce((s, i) => s + i.qty, 0)}</td>
                  <td>{money(o.totalPrice)}</td>
                  <td>{o.paymentMethod === 'COD' ? 'COD' : 'Online'} <span className={`badge ${o.paymentStatus === 'Paid' ? 'good' : 'warn'}`}>{o.paymentStatus}</span></td>
                  <td><span className={`badge ${cls(o.status)}`}>{o.status}</span></td>
                </tr>
              ))}
              {!data.items.length && <tr><td colSpan={7} className="muted center" style={{ padding: 40 }}>No orders match these filters</td></tr>}
            </tbody>
          </table></div>
          {data.pages > 1 && <div className="pager">{Array.from({ length: data.pages }, (_, i) => i + 1).map((n) => <button key={n} className={`pill ${n === page ? 'on' : ''}`} onClick={() => setPage(n)}>{n}</button>)}</div>}
        </>
      )}

      {open && (
        <Modal wide title={`Order ${open.orderNumber}`} onClose={() => setOpen(null)}>
          <div className="grid2" style={{ alignItems: 'start' }}>
            <div className="stack">
              <div><div className="muted small">Customer</div><div>{open.user?.name}</div><div className="small muted">{open.user?.email}</div></div>
              <div><div className="muted small">Deliver to</div><div className="small">{open.shippingAddress.fullName}, {open.shippingAddress.phone}<br />{open.shippingAddress.line1}{open.shippingAddress.line2 ? ', ' + open.shippingAddress.line2 : ''}<br />{open.shippingAddress.city}, {open.shippingAddress.state} {open.shippingAddress.pincode}</div>
                {open.shippingAddress.lat && <a className="link small" target="_blank" rel="noreferrer" href={`https://www.google.com/maps?q=${open.shippingAddress.lat},${open.shippingAddress.lng}`}>Open pinned location in Maps</a>}</div>
              <div>{open.items.map((i, n) => <div className="row small" key={n} style={{ padding: '6px 0' }}><img className="thumb" style={{ width: 36, height: 44 }} src={img(i.image)} alt="" /><span style={{ flex: 1 }}>{i.name} × {i.qty}</span><span>{money(i.price * i.qty)}</span></div>)}
                <div className="sum-row total"><span>Total ({open.paymentMethod === 'COD' ? 'cash on delivery' : 'online'}, {open.paymentStatus.toLowerCase()})</span><span>{money(open.totalPrice)}</span></div></div>
            </div>
            <div className="stack">
              <div className="card" style={{ background: 'var(--bg)' }}>
                <h3 style={{ fontSize: 20, marginBottom: 12 }}>Update order</h3>
                <div className="stack">
                  <div className="field"><label>Status</label><select className="input" value={upd.status} onChange={(e) => setUpd({ ...upd, status: e.target.value })}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></div>
                  <div className="grid2">
                    <div className="field"><label>Delivery company / partner</label><input className="input" value={upd.courier} onChange={(e) => setUpd({ ...upd, courier: e.target.value })} placeholder="e.g., Delhivery" /></div>
                    <div className="field"><label>Tracking number</label><input className="input" value={upd.trackingNumber} onChange={(e) => setUpd({ ...upd, trackingNumber: e.target.value })} /></div>
                  </div>
                  <p className="muted small">The delivery company manages its own delivery staff. You only need to provide the company and tracking number.</p>
                  <div className="field"><label>Note for the customer (optional)</label><input className="input" value={upd.note} onChange={(e) => setUpd({ ...upd, note: e.target.value })} placeholder="e.g. Left the warehouse in Bengaluru" /></div>
                  <button className="btn btn-primary" onClick={save}>Save update</button>
                </div>
              </div>
              <div className="card" style={{ background: 'var(--bg)' }}>
                <h3 style={{ fontSize: 20, marginBottom: 12 }}>
                  Delhivery shipment
                </h3>
                <div className="stack">
                  {open.delhiveryShipmentCreated || ['unknown', 'creating'].includes(open.delhiveryShipmentState) ? (
                    open.delhiveryShipmentCreated ? (
                    <>
                      <p className="small">Waybill: <strong>{open.delhiveryWaybill}</strong></p>
                      <p className="small">Latest status: <strong>{open.delhiveryStatus || 'Awaiting carrier update'}</strong></p>
                      <div className="row wrap">
                        <button className="btn btn-outline" onClick={refreshDelhiveryTracking} disabled={trackingShipment}>
                          <RefreshCw size={16} />{trackingShipment ? 'Refreshing…' : 'Refresh tracking'}
                        </button>
                        <button className="btn btn-outline" onClick={downloadLabel}><Printer size={16} />Download label</button>
                        <button className="btn btn-outline" onClick={cancelDelhiveryShipment}><Ban size={16} />Cancel shipment</button>
                      </div>
                      {!!open.delhiveryTracking?.length && <div className="stack" style={{ marginTop: 8 }}>
                        <strong className="small">Carrier events</strong>
                        {open.delhiveryTracking.map((event, index) => (
                          <div className="small muted" key={`${event.date || ''}-${index}`}>
                            {event.date ? `${fmtDateTime(event.date)} · ` : ''}{event.status || event.description}
                            {event.location ? ` · ${event.location}` : ''}
                          </div>
                        ))}
                      </div>}
                    </>
                    ) : (
                    <>
                      <p className="small" role="alert">
                        {open.delhiveryShipmentState === 'creating'
                          ? 'A Delhivery request may still be in progress. Do not send this order to another courier until you verify its status.'
                          : 'Delhivery did not confirm the last request. Verify in Delhivery before attempting another shipment to avoid duplicates.'}
                      </p>
                      {open.delhiveryShipmentState === 'unknown' && (
                        <button className="btn btn-outline" onClick={reconcileDelhiveryShipment}>I verified no shipment exists — allow retry</button>
                      )}
                    </>
                    )
                  ) : open.shiprocketOrderCreated ? (
                    <>
                      <p className="small">This is a legacy Shiprocket order (ID: <strong>{open.shiprocketOrderId}</strong>). Existing shipments are not migrated automatically; finish or cancel this one in the original account.</p>
                      <button className="btn btn-outline" onClick={confirmShiprocketCancellation}>I cancelled this legacy shipment</button>
                    </>
                  ) : (
                    <>
                      <p className="muted small">Eligible orders are sent to Delhivery automatically using the configured default parcel size. If automatic creation failed, retry it here.</p>
                      <button className="btn btn-outline" onClick={createDelhiveryShipment} disabled={creatingShipment || ['creating', 'unknown'].includes(open.delhiveryShipmentState) || (open.paymentMethod === 'ONLINE' && open.paymentStatus !== 'Paid')}>
                        {creatingShipment ? 'Creating shipment…' : 'Create Delhivery shipment'}
                      </button>
                    </>
                  )}
                </div>
              </div>
              <OrderTimeline order={open} />
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

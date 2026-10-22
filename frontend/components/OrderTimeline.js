import { fmtDateTime } from '@/lib/api';

const STEPS = ['Placed', 'Confirmed', 'Packed', 'Shipped', 'Out for delivery', 'Delivered'];

// Shows every step; steps reached are filled in, with the time and any note from the store
export default function OrderTimeline({ order }) {
  if (order.status === 'Cancelled') {
    return (
      <ul className="timeline">
        {order.tracking.map((t, i) => (
          <li key={i} className={t.status === 'Cancelled' ? 'cancel' : 'done'}>
            <strong>{t.status}</strong> <span className="small muted">{fmtDateTime(t.at)}</span>
            {t.note && <div className="small">{t.note}</div>}
          </li>
        ))}
      </ul>
    );
  }
  const idx = STEPS.indexOf(order.status);
  return (
    <ul className="timeline">
      {STEPS.map((s, i) => {
        const events = order.tracking.filter((t) => t.status === s);
        const last = events[events.length - 1];
        return (
          <li key={s} className={i < idx ? 'done' : i === idx ? 'done now' : ''}>
            <strong>{s}</strong> {last && <span className="small muted">{fmtDateTime(last.at)}</span>}
            {events.filter((e) => e.note).map((e, j) => <div key={j} className="small muted">{e.note}</div>)}
            {s === 'Shipped' && i <= idx && order.trackingNumber && <div className="small">{order.courier || 'Courier'} tracking no. {order.trackingNumber}</div>}
          </li>
        );
      })}
    </ul>
  );
}

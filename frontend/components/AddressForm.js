'use client';
import { useState } from 'react';
import { MapPin } from 'lucide-react';
import toast from 'react-hot-toast';

const empty = { label: 'Home', fullName: '', phone: '', line1: '', line2: '', city: '', state: '', pincode: '', country: 'India', isDefault: false };

export default function AddressForm({ initial, onSave, onCancel, busy }) {
  const [f, setF] = useState({ ...empty, ...(initial || {}) });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const locate = () => {
    if (!navigator.geolocation) return toast.error('Location is not supported in this browser');
    navigator.geolocation.getCurrentPosition(
      (pos) => { setF((x) => ({ ...x, lat: pos.coords.latitude, lng: pos.coords.longitude })); toast.success('Location pinned to this address'); },
      () => toast.error('Allow location access to pin your address')
    );
  };

  return (
    <form className="stack" onSubmit={(e) => { e.preventDefault(); onSave(f); }}>
      <div className="grid2">
        <div className="field"><label>Full name</label><input className="input" required value={f.fullName} onChange={set('fullName')} /></div>
        <div className="field"><label>Phone</label><input className="input" required pattern="[0-9+\- ]{10,15}" title="Enter a valid phone number" value={f.phone} onChange={set('phone')} /></div>
      </div>
      <div className="field"><label>Address line 1</label><input className="input" required value={f.line1} onChange={set('line1')} placeholder="House / flat, street" /></div>
      <div className="field"><label>Address line 2 (optional)</label><input className="input" value={f.line2} onChange={set('line2')} placeholder="Landmark, area" /></div>
      <div className="grid3">
        <div className="field"><label>City</label><input className="input" required value={f.city} onChange={set('city')} /></div>
        <div className="field"><label>State</label><input className="input" required value={f.state} onChange={set('state')} /></div>
        <div className="field"><label>Pincode</label><input className="input" required pattern="[0-9]{6}" title="6-digit pincode" value={f.pincode} onChange={set('pincode')} /></div>
      </div>
      <div className="grid2">
        <div className="field"><label>Save as</label>
          <select className="input" value={f.label} onChange={set('label')}><option>Home</option><option>Work</option><option>Other</option></select>
        </div>
        <div className="field"><label>Delivery location</label>
          <button type="button" className="btn btn-outline" onClick={locate}><MapPin size={16} />{f.lat ? 'Location pinned' : 'Use my current location'}</button>
        </div>
      </div>
      <label className="check"><input type="checkbox" checked={!!f.isDefault} onChange={set('isDefault')} /> Make this my default address</label>
      <div className="row">
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save address'}</button>
        {onCancel && <button type="button" className="btn btn-outline" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  );
}

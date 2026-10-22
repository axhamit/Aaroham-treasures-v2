'use client';
import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import api, { errMsg, img } from '@/lib/api';
import { useSettings } from '@/context/SettingsContext';

const presets = [
  { name: 'Emerald and brass', primaryColor: '#0F2D28', accentColor: '#B38B59', backgroundColor: '#F4F4F1' },
  { name: 'Oxblood and gold', primaryColor: '#4A1620', accentColor: '#C2A15B', backgroundColor: '#F6F3F1' },
  { name: 'Midnight and silver', primaryColor: '#14213D', accentColor: '#A9B4C2', backgroundColor: '#F3F4F6' },
  { name: 'Graphite and copper', primaryColor: '#262626', accentColor: '#B87333', backgroundColor: '#F5F4F2' },
];

export default function AdminSettings() {
  const { settings, setSettings } = useSettings(); // editing here re-themes the whole site live
  const [busy, setBusy] = useState(false);
  const fileRef = useRef();
  const set = (k) => (e) => setSettings({ ...settings, [k]: e.target.type === 'number' ? Number(e.target.value) : e.target.value });

  const uploadHero = async (file) => {
    if (!file) return;
    const fd = new FormData(); fd.append('images', file);
    try { const { data } = await api.post('/admin/upload', fd); setSettings({ ...settings, heroImage: data.urls[0] }); } catch (e) { toast.error(errMsg(e)); }
  };

  const save = async () => {
    setBusy(true);
    try { await api.put('/settings', settings); toast.success('Store look saved'); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  return (
    <>
      <div className="row between wrap" style={{ marginBottom: 20 }}><h1 style={{ margin: 0 }}>Store look and feel</h1><button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button></div>
      <p className="muted" style={{ marginBottom: 24 }}>Changes appear on this page straight away. Press Save to publish them to every visitor.</p>
      <div className="grid2" style={{ alignItems: 'start' }}>
        <div className="stack">
          <section className="card stack">
            <h3 style={{ fontSize: 22 }}>Colours</h3>
            <div className="row wrap">{presets.map((p) => <button key={p.name} className="pill" onClick={() => setSettings({ ...settings, ...p })}><span style={{ display: 'inline-flex', marginRight: 8, verticalAlign: 'middle' }}>{[p.primaryColor, p.accentColor, p.backgroundColor].map((c) => <i key={c} style={{ width: 14, height: 14, background: c, border: '1px solid #0002', marginRight: -3, borderRadius: '50%' }} />)}</span>{p.name}</button>)}</div>
            {[['primaryColor', 'Main colour (header, buttons, footer)'], ['accentColor', 'Accent colour (highlights, hero button)'], ['backgroundColor', 'Page background']].map(([k, l]) => (
              <div className="field" key={k}><label>{l}</label><div className="swatch"><input type="color" value={settings[k]} onChange={set(k)} /><input className="input" style={{ width: 130 }} value={settings[k]} onChange={set(k)} /></div></div>
            ))}
          </section>
          <section className="card stack">
            <h3 style={{ fontSize: 22 }}>Shipping</h3>
            <div className="grid2">
              <div className="field"><label>Free shipping above (₹)</label><input className="input" type="number" min="0" value={settings.freeShippingAbove} onChange={set('freeShippingAbove')} /></div>
              <div className="field"><label>Shipping fee (₹)</label><input className="input" type="number" min="0" value={settings.shippingFee} onChange={set('shippingFee')} /></div>
            </div>
          </section>
        </div>
        <section className="card stack">
          <h3 style={{ fontSize: 22 }}>Words and hero image</h3>
          <div className="field"><label>Store name</label><input className="input" value={settings.storeName} onChange={set('storeName')} /></div>
          <div className="field"><label>Tagline</label><input className="input" value={settings.tagline} onChange={set('tagline')} /></div>
          <div className="field"><label>Announcement bar (leave empty to hide)</label><input className="input" value={settings.announcement} onChange={set('announcement')} /></div>
          <div className="field"><label>Home page headline</label><input className="input" value={settings.heroTitle} onChange={set('heroTitle')} /></div>
          <div className="field"><label>Home page sub-text</label><textarea className="input" value={settings.heroSubtitle} onChange={set('heroSubtitle')} /></div>
          <div className="field"><label>Hero image</label>
            <div className="row">{settings.heroImage && <img src={img(settings.heroImage)} alt="" width={70} height={90} style={{ objectFit: 'cover' }} />}
              <button type="button" className="btn btn-outline btn-sm" onClick={() => fileRef.current.click()}>Upload image</button>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => uploadHero(e.target.files[0])} /></div>
          </div>
        </section>
      </div>
    </>
  );
}

'use client';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, X, Upload } from 'lucide-react';
import api, { errMsg, img, money } from '@/lib/api';
import Modal from '@/components/Modal';

const blank = { name: '', brand: '', category: '', description: '', price: '', mrp: '', stock: 0, images: [], featured: false, isActive: true };

export default function AdminProducts() {
  const [items, setItems] = useState(null);
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef();

  const load = () => api.get('/products/admin/all', { params: { q } }).then((r) => setItems(r.data));
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const set = (k) => (e) => setEdit({ ...edit, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const upload = async (files) => {
    if (!files.length) return;
    const fd = new FormData();
    [...files].forEach((f) => fd.append('images', f));
    try {
      const { data } = await api.post('/admin/upload', fd);
      setEdit((x) => ({ ...x, images: [...x.images, ...data.urls] }));
    } catch (e) { toast.error(errMsg(e)); }
  };

  const save = async (e) => {
    e.preventDefault();
    if (!edit.images.length) return toast.error('Add at least one image');
    setBusy(true);
    const body = { ...edit, price: Number(edit.price), mrp: edit.mrp ? Number(edit.mrp) : undefined, stock: Number(edit.stock) };
    try {
      edit._id ? await api.put(`/products/${edit._id}`, body) : await api.post('/products', body);
      toast.success(edit._id ? 'Product updated' : 'Product added');
      setEdit(null); load();
    } catch (er) { toast.error(errMsg(er)); } finally { setBusy(false); }
  };

  const del = async (p) => {
    if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    try { await api.delete(`/products/${p._id}`); toast.success('Product deleted'); load(); } catch (e) { toast.error(errMsg(e)); }
  };

  // change price / stock straight from the table
  const quick = async (p, field, value) => {
    if (Number(value) === p[field]) return;
    try { await api.put(`/products/${p._id}`, { [field]: Number(value) }); toast.success('Saved'); load(); } catch (e) { toast.error(errMsg(e)); }
  };

  return (
    <>
      <div className="row between wrap" style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0 }}>Products</h1>
        <div className="row">
          <form onSubmit={(e) => { e.preventDefault(); load(); }}><input className="input" placeholder="Search products" value={q} onChange={(e) => setQ(e.target.value)} /></form>
          <button className="btn btn-primary" onClick={() => setEdit({ ...blank })}><Plus size={18} />Add product</button>
        </div>
      </div>

      {!items ? <div className="spinner" /> : (
        <div className="table-wrap"><table>
          <thead><tr><th></th><th>Product</th><th>Category</th><th>Price (₹)</th><th>Stock</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {items.map((p) => (
              <tr key={p._id}>
                <td><img className="thumb" src={img(p.images[0])} alt="" /></td>
                <td><strong>{p.name}</strong><div className="muted small">{p.brand}{p.featured ? ' · Featured' : ''}</div></td>
                <td>{p.category}</td>
                <td><input className="input" style={{ width: 110, padding: '8px 10px' }} type="number" defaultValue={p.price} onBlur={(e) => quick(p, 'price', e.target.value)} aria-label="Price" /></td>
                <td><input className="input" style={{ width: 80, padding: '8px 10px' }} type="number" defaultValue={p.stock} onBlur={(e) => quick(p, 'stock', e.target.value)} aria-label="Stock" /></td>
                <td><span className={`badge ${p.isActive ? 'good' : 'warn'}`}>{p.isActive ? 'Visible' : 'Hidden'}</span></td>
                <td><div className="row">
                  <button className="icon-btn" onClick={() => setEdit({ ...p })} aria-label="Edit"><Pencil size={17} /></button>
                  <button className="icon-btn" onClick={() => del(p)} aria-label="Delete" style={{ color: 'var(--danger)' }}><Trash2 size={17} /></button>
                </div></td>
              </tr>
            ))}
            {!items.length && <tr><td colSpan={7} className="muted center" style={{ padding: 40 }}>No products yet. Add your first one.</td></tr>}
          </tbody>
        </table></div>
      )}

      {edit && (
        <Modal title={edit._id ? 'Edit product' : 'Add product'} onClose={() => setEdit(null)}>
          <form className="stack" onSubmit={save}>
            <div className="field"><label>Name</label><input className="input" required value={edit.name} onChange={set('name')} /></div>
            <div className="grid2">
              <div className="field"><label>Brand</label><input className="input" value={edit.brand} onChange={set('brand')} /></div>
              <div className="field"><label>Category</label><input className="input" required value={edit.category} onChange={set('category')} placeholder="Sarees, Yoga Dress, Suits" /></div>
            </div>
            <div className="grid3">
              <div className="field"><label>Selling price (₹)</label><input className="input" type="number" min="0" required value={edit.price} onChange={set('price')} /></div>
              <div className="field"><label>Original price (₹, optional)</label><input className="input" type="number" min="0" value={edit.mrp || ''} onChange={set('mrp')} /></div>
              <div className="field"><label>Stock</label><input className="input" type="number" min="0" required value={edit.stock} onChange={set('stock')} /></div>
            </div>
            <div className="field"><label>Description</label><textarea className="input" value={edit.description} onChange={set('description')} /></div>
            <div className="field">
              <label>Images (first one is the cover)</label>
              <div className="upload-grid">
                {edit.images.map((u, n) => <div className="u" key={u + n}><img src={img(u)} alt="" /><button type="button" onClick={() => setEdit({ ...edit, images: edit.images.filter((_, j) => j !== n) })} aria-label="Remove image"><X size={13} /></button></div>)}
                <button type="button" className="btn btn-outline" style={{ height: 104, width: 84, flexDirection: 'column', padding: 0 }} onClick={() => fileRef.current.click()}><Upload size={18} /><span className="small">Upload</span></button>
                <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { upload(e.target.files); e.target.value = ''; }} />
              </div>
              <input className="input" placeholder="…or paste an image URL and press Enter" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); const v = e.target.value.trim(); if (v) { setEdit({ ...edit, images: [...edit.images, v] }); e.target.value = ''; } } }} />
            </div>
            <div className="row wrap" style={{ gap: 28 }}>
              <label className="check"><input type="checkbox" checked={edit.featured} onChange={set('featured')} /> Show on the home page</label>
              <label className="check"><input type="checkbox" checked={edit.isActive} onChange={set('isActive')} /> Visible in the store</label>
            </div>
            <div className="row"><button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save product'}</button><button type="button" className="btn btn-outline" onClick={() => setEdit(null)}>Cancel</button></div>
          </form>
        </Modal>
      )}
    </>
  );
}

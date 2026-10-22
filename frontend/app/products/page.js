'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import ProductCard from '@/components/ProductCard';

function Listing() {
  const sp = useSearchParams();
  const router = useRouter();
  const [data, setData] = useState({ items: [], pages: 1, total: 0 });
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(sp.get('q') || '');

  const category = sp.get('category') || '';
  const sort = sp.get('sort') || 'new';
  const page = Number(sp.get('page') || 1);
  const minPrice = sp.get('minPrice') || '';
  const maxPrice = sp.get('maxPrice') || '';
  const query = sp.get('q') || '';

  const update = (patch) => {
    const n = new URLSearchParams(sp.toString());
    Object.entries({ page: 1, ...patch }).forEach(([k, v]) => (v ? n.set(k, v) : n.delete(k)));
    router.push('/products?' + n.toString());
  };

  useEffect(() => { api.get('/products/categories').then((r) => setCats(r.data)); }, []);
  useEffect(() => {
    setLoading(true);
    api.get('/products', { params: { q: query, category, sort, page, minPrice, maxPrice, limit: 12 } })
      .then((r) => setData(r.data)).finally(() => setLoading(false));
  }, [query, category, sort, page, minPrice, maxPrice]);

  return (
    <div className="container page">
      <h1>{category || 'All pieces'}</h1>
      <div className="pills">
        <button className={`pill ${!category ? 'on' : ''}`} onClick={() => update({ category: '' })}>All</button>
        {cats.map((c) => <button key={c} className={`pill ${category === c ? 'on' : ''}`} onClick={() => update({ category: c })}>{c}</button>)}
      </div>
      <form className="filters" onSubmit={(e) => { e.preventDefault(); update({ q }); }}>
        <input className="input" style={{ minWidth: 240 }} placeholder="Search by name or brand" value={q} onChange={(e) => setQ(e.target.value)} />
        <input className="input" type="number" style={{ width: 130 }} placeholder="Min ₹" defaultValue={minPrice} onBlur={(e) => update({ minPrice: e.target.value })} />
        <input className="input" type="number" style={{ width: 130 }} placeholder="Max ₹" defaultValue={maxPrice} onBlur={(e) => update({ maxPrice: e.target.value })} />
        <select className="input" value={sort} onChange={(e) => update({ sort: e.target.value })}>
          <option value="new">Newest</option><option value="price_asc">Price, low to high</option><option value="price_desc">Price, high to low</option>
        </select>
        <button className="btn btn-primary">Search</button>
      </form>

      {loading ? <div className="spinner" /> : data.items.length ? (
        <div className="products">{data.items.map((p) => <ProductCard key={p._id} p={p} />)}</div>
      ) : (
        <div className="empty"><h3>No pieces match</h3><p className="muted">Try a different category or clear the price range.</p></div>
      )}

      {data.pages > 1 && (
        <div className="pager">
          {Array.from({ length: data.pages }, (_, i) => i + 1).map((n) => <button key={n} className={`pill ${n === page ? 'on' : ''}`} onClick={() => update({ page: n })}>{n}</button>)}
        </div>
      )}
    </div>
  );
}

export default function ProductsPage() { return <Suspense fallback={<div className="spinner" />}><Listing /></Suspense>; }

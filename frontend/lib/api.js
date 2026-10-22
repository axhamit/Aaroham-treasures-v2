import axios from 'axios';

export const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
export const API_ORIGIN = API.replace(/\/api\/?$/, '');

const api = axios.create({ baseURL: API });

// attach the JWT to every request
api.interceptors.request.use((cfg) => {
  if (typeof window !== 'undefined') {
    const t = localStorage.getItem('luxe_token');
    if (t) cfg.headers.Authorization = `Bearer ${t}`;
  }
  return cfg;
});

// if the token is rejected, log the user out everywhere
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined' && localStorage.getItem('luxe_token')) {
      localStorage.removeItem('luxe_token');
      window.dispatchEvent(new Event('luxe-logout'));
    }
    return Promise.reject(err);
  }
);

export const img = (p) => (!p ? '' : p.startsWith('http') ? p : API_ORIGIN + p);
export const money = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
export const errMsg = (e) => e?.response?.data?.message || e?.message || 'Something went wrong';
export const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
export const fmtDateTime = (d) => new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export default api;

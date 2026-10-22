'use client';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const finish = (data) => {
    localStorage.setItem('luxe_token', data.token);
    setUser(data.user);
    return data.user;
  };

  useEffect(() => {
    const t = localStorage.getItem('luxe_token');
    if (!t) { setLoading(false); return; }
    api.get('/auth/me').then((r) => setUser(r.data.user)).catch(() => localStorage.removeItem('luxe_token')).finally(() => setLoading(false));
    const onLogout = () => setUser(null);
    window.addEventListener('luxe-logout', onLogout);
    return () => window.removeEventListener('luxe-logout', onLogout);
  }, []);

  const login = useCallback(async (email, password) => finish((await api.post('/auth/login', { email, password })).data), []);
  const register = useCallback(async (name, email, password) => finish((await api.post('/auth/register', { name, email, password })).data), []);
  const googleLogin = useCallback(async (credential) => finish((await api.post('/auth/google', { credential })).data), []);
  const logout = useCallback(() => { localStorage.removeItem('luxe_token'); setUser(null); }, []);

  return <Ctx.Provider value={{ user, setUser, loading, login, register, googleLogin, logout }}>{children}</Ctx.Provider>;
}

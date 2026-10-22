'use client';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import api, { errMsg } from '@/lib/api';
import { useAuth } from './AuthContext';

const Ctx = createContext(null);
export const useShop = () => useContext(Ctx);

export function ShopProvider({ children }) {
  const { user } = useAuth();
  const router = useRouter();
  const [cart, setCart] = useState([]);
  const [wishIds, setWishIds] = useState([]);

  const refresh = useCallback(async () => {
    if (!user) { setCart([]); setWishIds([]); return; }
    try {
      const [c, w] = await Promise.all([api.get('/me/cart'), api.get('/me/wishlist-ids')]);
      setCart(c.data); setWishIds(w.data);
    } catch {}
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const needLogin = () => { toast('Log in to continue'); router.push('/login?next=' + encodeURIComponent(window.location.pathname)); };

  const addToCart = async (product, qty = 1) => {
    if (!user) return needLogin();
    try { setCart((await api.post('/me/cart', { productId: product._id, qty })).data); toast.success('Added to your bag'); }
    catch (e) { toast.error(errMsg(e)); }
  };
  const setQty = async (productId, qty) => {
    try { setCart((await api.put(`/me/cart/${productId}`, { qty })).data); } catch (e) { toast.error(errMsg(e)); }
  };
  const removeItem = async (productId) => {
    try { setCart((await api.delete(`/me/cart/${productId}`)).data); } catch (e) { toast.error(errMsg(e)); }
  };
  const toggleWish = async (product) => {
    if (!user) return needLogin();
    try {
      const { data } = await api.post(`/me/wishlist/${product._id}`);
      setWishIds(data.ids);
      toast.success(data.added ? 'Saved to your wishlist' : 'Removed from your wishlist');
    } catch (e) { toast.error(errMsg(e)); }
  };

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const cartTotal = cart.reduce((s, i) => s + i.qty * i.product.price, 0);

  return <Ctx.Provider value={{ cart, cartCount, cartTotal, wishIds, addToCart, setQty, removeItem, toggleWish, refresh }}>{children}</Ctx.Provider>;
}

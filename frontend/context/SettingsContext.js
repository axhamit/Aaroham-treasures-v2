'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import api from '@/lib/api';

const defaults = {
  storeName: 'Aaroham treasures', tagline: 'Objects made to be kept', announcement: '', heroTitle: 'Considered pieces for a considered life',
  heroSubtitle: '', heroImage: '', primaryColor: '#0F2D28', accentColor: '#B38B59', backgroundColor: '#F4F4F1', freeShippingAbove: 5000, shippingFee: 150,
};
const Ctx = createContext({ settings: defaults, setSettings: () => {} });
export const useSettings = () => useContext(Ctx);

// Writes the admin-chosen colours into CSS variables so the whole site re-themes instantly
export function applyTheme(s) {
  const r = document.documentElement.style;
  r.setProperty('--primary', s.primaryColor);
  r.setProperty('--accent', s.accentColor);
  r.setProperty('--bg', s.backgroundColor);
}

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(defaults);
  useEffect(() => {
    api.get('/settings').then((r) => {
      const loadedSettings = { ...defaults, ...r.data };
      if (loadedSettings.storeName === 'Maison Luxe') loadedSettings.storeName = defaults.storeName;
      setSettings(loadedSettings);
    }).catch(() => {});
  }, []);
  useEffect(() => { applyTheme(settings); }, [settings]);
  return <Ctx.Provider value={{ settings, setSettings }}>{children}</Ctx.Provider>;
}

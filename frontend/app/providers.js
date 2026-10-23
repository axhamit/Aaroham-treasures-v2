'use client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/context/AuthContext';
import { ShopProvider } from '@/context/ShopContext';
import { SettingsProvider } from '@/context/SettingsContext';

export default function Providers({ children }) {
  return (
    <GoogleOAuthProvider clientId={process.env.NEXT_GOOGLE_CLIENT_ID || 'missing-client-id'}>
      <SettingsProvider>
        <AuthProvider>
          <ShopProvider>
            {children}
            <Toaster position="bottom-center" toastOptions={{ style: { background: '#0F2D28', color: '#fff', fontSize: 14 } }} />
          </ShopProvider>
        </AuthProvider>
      </SettingsProvider>
    </GoogleOAuthProvider>
  );
}

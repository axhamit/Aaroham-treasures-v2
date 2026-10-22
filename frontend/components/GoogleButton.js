'use client';
import { GoogleLogin } from '@react-oauth/google';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { errMsg } from '@/lib/api';

export default function GoogleButton({ onSuccess }) {
  const { googleLogin } = useAuth();
  if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) return <p className="small muted center">Google sign-in is not configured yet (add NEXT_PUBLIC_GOOGLE_CLIENT_ID).</p>;
  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <GoogleLogin
        width="360"
        text="continue_with"
        shape="rectangular"
        onSuccess={async (res) => {
          try { onSuccess(await googleLogin(res.credential)); } catch (e) { toast.error(errMsg(e)); }
        }}
        onError={() => toast.error('Google sign-in was cancelled')}
      />
    </div>
  );
}

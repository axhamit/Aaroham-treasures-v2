'use client';
import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { errMsg } from '@/lib/api';
import GoogleButton from '@/components/GoogleButton';

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const next = useSearchParams().get('next') || '/';
  const [f, setF] = useState({ email: '', password: '' });
  const [busy, setBusy] = useState(false);

  const done = (u) => {
    toast.success(`Welcome back, ${u.name.split(' ')[0]}`);
    if (u.role === 'admin' && next === '/') {
      router.replace('/admin');
    } else if (u.role === 'courier') {
      router.replace('/courier');
    } else {
      router.replace(next);
    }
  };
  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try { done(await login(f.email, f.password)); } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };

  return (
    <div className="container page"><div className="auth">
      <h1 className="center">Log in</h1>
      <div className="card">
        <GoogleButton onSuccess={done} mode="login" />
        <div className="divider">or use your email</div>
        <form className="stack" onSubmit={submit}>
          <div className="field"><label>Email</label><input className="input" type="email" required autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
          <div className="field"><label>Password</label><input className="input" type="password" required autoComplete="current-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></div>
          <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
        </form>
      </div>
      <p className="center muted" style={{ marginTop: 20 }}>New here? <Link className="link" href={`/register?next=${encodeURIComponent(next)}`}>Create an account</Link></p>
    </div></div>
  );
}
export default function LoginPage() { return <Suspense fallback={<div className="spinner" />}><LoginForm /></Suspense>; }

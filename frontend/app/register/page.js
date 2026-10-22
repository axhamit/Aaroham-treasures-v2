'use client';
import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { errMsg } from '@/lib/api';
import GoogleButton from '@/components/GoogleButton';

function RegisterForm() {
  const { register } = useAuth();
  const router = useRouter();
  const next = useSearchParams().get('next') || '/';
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);

  const done = (u) => { toast.success(`Welcome, ${u.name.split(' ')[0]}`); router.replace(next); };
  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try { done(await register(f.name, f.email, f.password)); } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };

  return (
    <div className="container page"><div className="auth">
      <h1 className="center">Create account</h1>
      <div className="card">
        <GoogleButton onSuccess={done} />
        <div className="divider">or sign up with email</div>
        <form className="stack" onSubmit={submit}>
          <div className="field"><label>Full name</label><input className="input" required autoComplete="name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div className="field"><label>Email</label><input className="input" type="email" required autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
          <div className="field"><label>Password (8+ characters)</label><input className="input" type="password" required minLength={8} autoComplete="new-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></div>
          <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button>
        </form>
      </div>
      <p className="center muted" style={{ marginTop: 20 }}>Already registered? <Link className="link" href={`/login?next=${encodeURIComponent(next)}`}>Log in</Link></p>
    </div></div>
  );
}
export default function RegisterPage() { return <Suspense fallback={<div className="spinner" />}><RegisterForm /></Suspense>; }

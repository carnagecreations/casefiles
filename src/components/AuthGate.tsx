import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth';
import { auth } from '../firebase';

function friendlyAuthError(e: any): string {
  const code = e && e.code ? String(e.code) : '';
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) {
    return 'Wrong email or password.';
  }
  if (code.includes('too-many-requests')) return 'Too many attempts — wait a bit and try again.';
  if (code.includes('invalid-email')) return 'That doesn’t look like a valid email.';
  if (code.includes('network-request-failed')) return 'Network error — check your connection and try again.';
  return 'Something went wrong signing in. Try again.';
}

export function useAuthUser(): { user: User | null; ready: boolean } {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setReady(true);
    });
    return () => unsub();
  }, []);

  return { user, ready };
}

export function signOutUser() {
  signOut(auth).catch(() => {});
}

export function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('Enter your email and password.');
      return;
    }
    setSubmitting(true);
    signInWithEmailAndPassword(auth, trimmedEmail, password)
      .catch((e) => setError(friendlyAuthError(e)))
      .finally(() => setSubmitting(false));
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 h-10 w-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-lg">
            CC
          </div>
          <h1 className="text-lg font-semibold text-slate-900">Clean Convictions</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to your business manager</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="block text-xs font-medium text-slate-600 mb-1">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@cleanconvictions.com"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          <div>
            <label htmlFor="login-password" className="block text-xs font-medium text-slate-600 mb-1">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          {error && <p className="text-sm text-rose-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-medium py-2.5 transition-colors"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-center text-[11px] text-slate-400 leading-relaxed">
          Accounts are added by Shiann in the Firebase console — there’s no public
          sign-up. Ask her if you need access.
        </p>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '../../lib/supabaseClient';
import Link from 'next/link';

type AppRole = 'manager' | 'guard';

const roleLabels: Record<AppRole, string> = {
  manager: 'Manager / Supervisor',
  guard: 'Guard / Technician',
};

const normalizeRole = (value: string | undefined | null) => {
  if (!value) return 'guard';
  const lower = value.toLowerCase();
  if (lower.startsWith('man')) return 'manager';
  return 'guard';
};

const redirectRoute = (role: AppRole) => (role === 'manager' ? '/management/dashboard' : '/guard');

export default function LoginClient({ role: roleParam }: { role?: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'loading' | 'signed_in' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const role = normalizeRole(roleParam);
  const label = roleLabels[role];

  useEffect(() => {
    const supabase = getSupabaseClient();
    let ignore = false;

    const checkLogin = async () => {
      setStatus('loading');
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (ignore) return;

      if (error) {
        setStatus('error');
        setMessage(error.message);
        return;
      }

      if (!session?.user) {
        setStatus('idle');
        return;
      }

      const user = session.user;
      const { data: profileData } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      const savedRole = (profileData?.role as AppRole) || role;

      if (!profileData?.role) {
        const profilePayload = {
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email,
          role,
        };

        await supabase.from('profiles').upsert([profilePayload], { onConflict: 'id' });
      }

      router.replace(redirectRoute(savedRole));
    };

    checkLogin();

    return () => {
      ignore = true;
    };
  }, [router, role]);

  const handleSignIn = async () => {
    setStatus('loading');
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/login?role=${role}`,
      },
    });

    if (error) {
      setStatus('error');
      setMessage(error.message);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-8 shadow-lg">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">ChemDeck sign in</p>
          <h1 className="mt-4 text-3xl font-semibold text-slate-900">Continue as {label}</h1>
          <p className="mt-3 text-slate-600">Sign in with Google to access your role-based workflow and sync your profile.</p>
        </div>

        <div className="mt-10 space-y-6">
          <button
            type="button"
            onClick={handleSignIn}
            disabled={status === 'loading'}
            className="w-full rounded-3xl bg-slate-900 px-6 py-4 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {status === 'loading' ? 'Signing in…' : `Sign in with Google as ${label}`}
          </button>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <p>
              Need to switch roles?{' '}
              <Link href="/" className="font-semibold text-slate-900 hover:text-slate-700">
                Go back to role selection
              </Link>
              .
            </p>
          </div>

          {message ? (
            <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <p className="font-semibold">Error</p>
              <p>{message}</p>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}

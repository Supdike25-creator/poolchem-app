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
      const { data: profileData } = await supabase.from('profiles').select('role, organization_id').eq('id', user.id).single();
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

      // Check if user has an organization
      if (!profileData?.organization_id) {
        router.replace('/onboarding/company');
        return;
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
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-200 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-8 lg:p-10">
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <p className="text-sm font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400">ChemDeck sign in</p>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Continue as {label}</h1>
          <p className="mt-3 text-slate-600 dark:text-slate-300">Sign in with Google to access your role-based workflow and sync your profile.</p>
        </div>

        <div className="mt-10 space-y-6">
          <button
            type="button"
            onClick={handleSignIn}
            disabled={status === 'loading'}
            className="w-full flex items-center justify-center rounded-2xl bg-slate-900 dark:bg-slate-700 px-6 py-4 text-sm font-semibold text-white transition hover:bg-slate-800 dark:hover:bg-slate-600 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {status === 'loading' ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing in…
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign in with Google as {label}
              </>
            )}
          </button>

          <div className="bg-blue-50 dark:bg-blue-950 rounded-2xl border border-blue-200 dark:border-blue-800 p-5">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Need to switch roles?</p>
                <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
                  <Link href="/" className="font-semibold hover:text-blue-800 dark:hover:text-blue-200 transition-colors">
                    Go back to role selection
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>

          {message ? (
            <div className="bg-red-50 dark:bg-red-950 rounded-2xl border border-red-200 dark:border-red-800 p-5">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <p className="font-semibold text-red-800 dark:text-red-200">Error</p>
                  <p className="mt-1 text-sm text-red-700 dark:text-red-300">{message}</p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}

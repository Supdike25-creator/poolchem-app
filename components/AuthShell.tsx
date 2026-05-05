'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getSupabaseClient } from '../lib/supabaseClient';

type AppRole = 'manager' | 'guard';

type Profile = {
  full_name?: string | null;
  email?: string | null;
  role?: string | null;
};

const navItems: Record<AppRole, Array<{ label: string; href: string }>> = {
  manager: [
    { label: 'Dashboard', href: '/management/dashboard' },
    { label: 'Pools', href: '/management/pools' },
    { label: 'Logs', href: '/management/logs' },
    { label: 'Announcements', href: '/management/announcements' },
    { label: 'Settings', href: '/management/settings' },
    { label: 'Help', href: '/management/settings#help' },
  ],
  guard: [
    { label: 'Guard Home', href: '/guard' },
    { label: 'New Log', href: '/guard/log' },
    { label: 'Review Logs', href: '/guard/review' },
    { label: 'Announcements', href: '/management/announcements' },
    { label: 'Settings', href: '/management/settings' },
    { label: 'Help', href: '/management/settings#help' },
  ],
};

const roleLabels: Record<AppRole, string> = {
  manager: 'Manager / Supervisor',
  guard: 'Guard / Technician',
};

const authorizedRoute = (role: AppRole) => (role === 'manager' ? '/management/dashboard' : '/guard');

export default function AuthShell({ role, children }: { role: AppRole; children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const supabase = getSupabaseClient();
    let isMounted = true;

    const restoreSession = async () => {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (sessionError) {
          setError(sessionError.message);
          setStatus('unauthenticated');
          router.replace(`/login?role=${role}`);
          return;
        }

        const user = session?.user;
        if (!user) {
          setStatus('unauthenticated');
          router.replace(`/login?role=${role}`);
          return;
        }

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id,email,full_name,role,organization_id')
          .eq('id', user.id)
          .single();

        if (!isMounted) return;

        // Check if user has an organization
        if (!profileData?.organization_id) {
          router.replace('/onboarding/company');
          return;
        }

        const savedRole = (profileData?.role as AppRole) || role;
        if (savedRole !== role) {
          router.replace(authorizedRoute(savedRole));
          return;
        }

        setProfile({
          full_name: profileData?.full_name || user.user_metadata?.full_name || user.email || '',
          email: profileData?.email || user.email || '',
          role: savedRole,
        });
        setStatus('authenticated');
      } catch (err) {
        if (!isMounted) return;
        setError((err as Error)?.message || 'Unable to verify your session.');
        setStatus('unauthenticated');
        router.replace(`/login?role=${role}`);
      }
    };

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, [router, role]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        router.replace('/');
      }
    });

    return () => data?.subscription?.unsubscribe?.();
  }, [router]);

  const handleLogout = async () => {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    router.push('/');
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-200 flex items-center justify-center px-4 py-8">
        <div className="rounded-3xl border border-blue-200 bg-white p-8 shadow-xl text-center">
          <div className="animate-pulse">
            <div className="w-12 h-12 bg-blue-100 rounded-full mx-auto mb-4"></div>
            <p className="text-sm text-blue-600 font-medium">Restoring your session</p>
            <p className="mt-2 text-xl font-semibold text-slate-900">Please wait…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-200 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden">
          <div className="px-6 py-6 lg:px-8 lg:py-8">
            <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">{roleLabels[role]}</p>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{role === 'manager' ? 'Management Workspace' : 'Guard Workbench'}</h1>
                  </div>
                </div>
                <p className="mt-3 text-slate-600 dark:text-slate-300 max-w-2xl">
                  Secure access for your assigned role with quick navigation and account controls.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="rounded-2xl border border-blue-200 dark:border-slate-600 bg-blue-50 dark:bg-slate-700 px-5 py-4 text-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">
                        {(profile?.full_name || profile?.email || 'U')[0].toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">{profile?.full_name || 'User'}</p>
                      <p className="text-blue-600 dark:text-blue-400">{profile?.email}</p>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center justify-center rounded-2xl bg-slate-900 dark:bg-slate-700 px-5 py-4 text-sm font-medium text-white hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Log out
                </button>
              </div>
            </div>

            <div className="grid gap-8 xl:grid-cols-[1fr_320px]">
              <main className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 lg:p-8">{children}</main>

              <aside className="space-y-6">
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-blue-200 dark:border-slate-700 p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    <p className="text-sm font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">Quick links</p>
                  </div>
                  <div className="space-y-2">
                    {navItems[role].map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`group flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                          pathname === item.href
                            ? 'bg-blue-600 text-white shadow-md dark:bg-blue-700'
                            : 'bg-slate-50 text-slate-700 hover:bg-blue-50 hover:text-blue-700 border border-transparent hover:border-blue-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 dark:hover:text-blue-300 dark:border-slate-600 dark:hover:border-slate-500'
                        }`}
                      >
                        <span>{item.label}</span>
                        <svg className={`w-4 h-4 transition-transform ${pathname === item.href ? 'text-white' : 'text-blue-400 group-hover:translate-x-1 dark:text-blue-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    ))}
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-blue-200 dark:border-slate-700 p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <p className="text-sm font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">Your role</p>
                  </div>
                  <p className="text-lg font-bold text-slate-900 dark:text-white mb-3">{roleLabels[role]}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    Your current session is limited to the selected workspace. Use the log out button to start again.
                  </p>
                </div>

                {error ? (
                  <div className="bg-red-50 dark:bg-red-950 rounded-2xl border border-red-200 dark:border-red-800 p-5 shadow-sm">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <div>
                        <p className="font-semibold text-red-800 dark:text-red-200">Authentication issue</p>
                        <p className="mt-1 text-sm text-red-700 dark:text-red-300">{error}</p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </aside>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

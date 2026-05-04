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
    { label: 'Settings', href: '/management/settings' },
  ],
  guard: [
    { label: 'Guard Home', href: '/guard' },
    { label: 'New Log', href: '/guard/log' },
    { label: 'Review Logs', href: '/guard/review' },
    { label: 'Manager Tools', href: '/management/dashboard' },
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
          .select('id,email,full_name,role')
          .eq('id', user.id)
          .single();

        if (!isMounted) return;

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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-8">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-lg text-center">
          <p className="text-sm text-slate-500">Restoring your session</p>
          <p className="mt-4 text-xl font-semibold text-slate-900">Please wait…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">{roleLabels[role]}</p>
            <h1 className="text-3xl font-semibold text-slate-900">{role === 'manager' ? 'Management Workspace' : 'Guard Workbench'}</h1>
            <p className="mt-2 text-slate-600 max-w-2xl">
              Secure access for your assigned role with quick navigation and account controls.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
              <p className="font-medium text-slate-900">{profile?.full_name || profile?.email}</p>
              <p className="text-slate-500">{profile?.email}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center justify-center rounded-3xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-700"
            >
              Log out
            </button>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_280px]">
          <main className="rounded-3xl bg-white p-6 shadow-sm">{children}</main>

          <aside className="space-y-6 rounded-3xl border border-slate-200 bg-slate-50 p-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Quick links</p>
              <div className="mt-4 space-y-2">
                {navItems[role].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`block rounded-2xl px-4 py-3 text-sm font-medium transition ${pathname === item.href ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 hover:bg-slate-100'}`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5">
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Your role</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{roleLabels[role]}</p>
              <p className="mt-2 text-sm text-slate-600">
                Your current session is limited to the selected workspace. Use the log out button to start again.
              </p>
            </div>

            {error ? (
              <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <p className="font-semibold">Authentication issue</p>
                <p>{error}</p>
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </div>
  );
}

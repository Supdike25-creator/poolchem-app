'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  FlaskConical,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { clearAppSession, getStoredSession, normalizeAppRole } from '../lib/appAccounts';
import { createClient } from '@/utils/supabase/client';
import { bypassProfileForRole, temporaryLoginBypass } from '../lib/temporaryLoginBypass';
import { SidebarNav } from './SidebarNav';

type AppRole = 'manager' | 'guard';

type Profile = {
  full_name?: string | null;
  email?: string | null;
  role?: string | null;
};

const roleLabels: Record<AppRole, string> = {
  manager: 'Manager / Supervisor',
  guard: 'Guard / Technician',
};

const authorizedRoute = (role: AppRole) => (role === 'manager' ? '/management/dashboard' : '/guard');

const normalizeProfileRole = (role?: string | null): AppRole => {
  return normalizeAppRole(role);
};

export default function AuthShell({ role, children }: { role: AppRole; children: React.ReactNode }) {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      try {
        if (temporaryLoginBypass) {
          if (!isMounted) return;
          setProfile(bypassProfileForRole(role));
          setStatus('authenticated');
          return;
        }

        const supabase = createClient();
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
          const appSession = getStoredSession();

          if (appSession && appSession.role === role) {
            setProfile({
              full_name: appSession.name || appSession.username,
              email: appSession.email || appSession.username,
              role: appSession.role,
            });
            setStatus('authenticated');
            return;
          }

          if (appSession && appSession.role !== role) {
            router.replace(authorizedRoute(appSession.role));
            return;
          }

          setStatus('unauthenticated');
          router.replace(`/login?role=${role}`);
          return;
        }

        const { data: profileData } = await supabase
          .from('profiles')
          .select('id,email,full_name,role')
          .eq('id', user.id)
          .single();

        if (!isMounted) return;

        const savedRole = profileData?.role ? normalizeProfileRole(profileData.role) : role;
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
    if (temporaryLoginBypass) {
      return undefined;
    }

    const supabase = createClient();
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        router.replace('/');
      }
    });

    return () => data?.subscription?.unsubscribe?.();
  }, [router]);

  const handleLogout = async () => {
    if (temporaryLoginBypass) {
      clearAppSession();
      router.push('/');
      return;
    }

    const supabase = createClient();
    await supabase.auth.signOut();
    clearAppSession();
    router.push('/');
  };

  const handleBackToLogin = async () => {
    if (temporaryLoginBypass) {
      clearAppSession();
      router.push(`/login?role=${role}`);
      return;
    }

    const supabase = createClient();
    await supabase.auth.signOut();
    clearAppSession();
    router.push(`/login?role=${role}`);
  };

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-slate-50 px-4 py-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <div className="animate-pulse">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50">
              <FlaskConical className="h-6 w-6 text-blue-600" />
            </div>
            <p className="text-sm font-semibold text-blue-700">Restoring your session</p>
            <p className="mt-2 text-lg font-semibold text-slate-950">Please wait...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 pb-24 lg:pb-0">
      <SidebarNav
        header={(
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950">
              <FlaskConical className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="sidebar-label text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">ChemDeck</p>
              <p className="sidebar-label truncate text-sm font-semibold text-slate-950">{role === 'manager' ? 'Management' : 'Guard'}</p>
            </div>
          </div>
        )}
        footer={(
          <div className="flex h-11 w-10 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-2 transition-[width,padding] duration-200 ease-out group-hover:w-full group-hover:p-3 group-focus-within:w-full group-focus-within:p-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200">
                <ShieldCheck className="h-4 w-4 text-slate-500" />
              </div>
              <div className="min-w-0 max-w-0 overflow-hidden opacity-0 transition-[max-width,opacity] duration-200 ease-out group-hover:max-w-[180px] group-hover:opacity-100 group-focus-within:max-w-[180px] group-focus-within:opacity-100">
                <p className="whitespace-nowrap text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Role</p>
                <p className="mt-1 whitespace-nowrap text-sm font-semibold text-slate-950">{roleLabels[role]}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">Session access is scoped to this workspace.</p>
              </div>
            </div>
          </div>
        )}
      />

      <main className="min-h-screen w-full bg-white shadow-[0_18px_50px_rgba(15,23,42,0.07)] lg:ml-16 lg:w-[calc(100%-4rem)]">
        <div className="border-b border-slate-200 bg-white px-5 py-5 lg:px-7">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950">
                    <FlaskConical className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{roleLabels[role]}</p>
                    <h1 className="text-2xl font-semibold tracking-tight text-slate-950">{role === 'manager' ? 'Management Workspace' : 'Guard Workbench'}</h1>
                  </div>
                </div>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                  Quick access to the work that needs attention today.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900">
                      <span className="text-sm font-semibold text-white">
                        {(profile?.full_name || profile?.email || 'U')[0].toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-950">{profile?.full_name || 'User'}</p>
                      <p className="text-slate-500">{profile?.email}</p>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleBackToLogin}
                  data-sound="back"
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to login
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  data-sound="click"
                  className="inline-flex h-9 items-center justify-center rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </button>
              </div>
            </div>
        </div>

        <div className="bg-slate-50 p-5 lg:p-6">
          {error ? (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <p className="font-semibold text-red-800">Authentication issue</p>
                  <p className="mt-1 text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          ) : null}
          {children}
        </div>
      </main>
    </div>
  );
}

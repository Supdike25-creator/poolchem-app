'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Building2, KeyRound, LogOut, Moon, Settings, Sun, Monitor } from 'lucide-react';
import { getStoredSession } from '@/lib/appAccounts';
import { createClient } from '@/utils/supabase/client';
import { defaultCompanySettings, mergeCompanySettings, type CompanySettings } from '@/lib/companySettings';
import { PageHeader, SectionCard, buttonClass } from '../../../components/OperationsUI';
import CompanySwitcher from '../../../components/CompanySwitcher';
import { appVersion } from '../../../lib/generatedVersion';

type Profile = {
  full_name?: string | null;
  email?: string | null;
  role?: string | null;
};

const loadLocalSettings = () => {
  if (typeof window === 'undefined') return defaultCompanySettings;
  try {
    const raw = localStorage.getItem('chemdeck-settings');
    return mergeCompanySettings(raw ? JSON.parse(raw) : null);
  } catch {
    return defaultCompanySettings;
  }
};

export default function GuardSettingsPage() {
  const searchParams = useSearchParams();
  const companyId = searchParams.get('companyId');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [settings, setSettings] = useState<CompanySettings>(defaultCompanySettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setSettings(loadLocalSettings());

      const appSession = getStoredSession();
      if (appSession?.role === 'dev') {
        setProfile({
          full_name: appSession.name || 'ChemDeck Dev',
          email: appSession.email || appSession.username || 'ChemDeckDev',
          role: 'dev',
        });
      } else {
        const accountResponse = await fetch('/api/current-account', { cache: 'no-store', credentials: 'same-origin' });
        const accountResult = await accountResponse.json().catch(() => null);
        if (accountResponse.ok && accountResult?.account) {
          setProfile(accountResult.account);
        } else {
          const supabase = createClient();
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (session?.user) {
            setProfile({
              full_name: session.user.user_metadata?.full_name ?? null,
              email: session.user.email ?? null,
              role: null,
            });
          }
        }
      }

      const query = companyId ? `?companyId=${encodeURIComponent(companyId)}` : '';
      const response = await fetch(`/api/company-settings${query}`, { cache: 'no-store', credentials: 'same-origin' });
      const result = await response.json().catch(() => null);
      if (response.ok && result?.ok) {
        setCompanyName(result.company?.company_name?.trim() || '');
      }

      setLoading(false);
    };

    void load();
  }, [companyId]);

  const saveLocalPreference = (patch: Partial<CompanySettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    localStorage.setItem('chemdeck-settings', JSON.stringify(next));
    window.dispatchEvent(new Event('chemdeck-settings-change'));
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const backHref = companyId ? `/guard?companyId=${encodeURIComponent(companyId)}` : '/guard';

  if (loading) {
    return <p className="text-sm text-slate-500">Loading settings...</p>;
  }

  return (
    <div className="pb-24 lg:pb-8">
      <PageHeader
        eyebrow="Guard"
        title="Settings"
        description="Your account and display preferences."
        icon={<Settings className="h-4 w-4" />}
      />

      <div className="space-y-5">
        <SectionCard className="p-5">
          <div className="mb-4 flex items-center gap-2 text-slate-700">
            <KeyRound className="h-5 w-5" />
            <h2 className="text-base font-semibold text-slate-950">Account</h2>
          </div>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Name</dt>
              <dd className="mt-1 font-semibold text-slate-900">{profile?.full_name || 'Not set'}</dd>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</dt>
              <dd className="mt-1 font-semibold text-slate-900">{profile?.email || 'Not set'}</dd>
            </div>
          </dl>
        </SectionCard>

        <SectionCard className="p-5">
          <div className="mb-4 flex items-center gap-2 text-slate-700">
            <Building2 className="h-5 w-5" />
            <h2 className="text-base font-semibold text-slate-950">Company</h2>
          </div>
          {companyName ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-lg font-semibold text-slate-950">{companyName}</p>
            </div>
          ) : (
            <p className="text-sm text-slate-600">Unable to load your company details right now.</p>
          )}
          <CompanySwitcher />
          <p className="mt-3 text-xs text-slate-500">Contact your manager if you need access changes.</p>
        </SectionCard>

        <SectionCard className="p-5">
          <div className="mb-4 flex items-center gap-2 text-slate-700">
            <Sun className="h-5 w-5" />
            <h2 className="text-base font-semibold text-slate-950">Display</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {(['light', 'dark', 'system'] as const).map((theme) => (
              <button
                key={theme}
                type="button"
                onClick={() => saveLocalPreference({ theme })}
                className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ${
                  settings.theme === theme
                    ? 'border-blue-300 bg-blue-50 text-blue-800'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {theme === 'light' ? <Sun className="h-4 w-4" /> : theme === 'dark' ? <Moon className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
                {theme.charAt(0).toUpperCase() + theme.slice(1)}
              </button>
            ))}
          </div>
          <label className="mt-4 flex items-center gap-3 text-sm font-medium">
            <input
              type="checkbox"
              checked={settings.largerTextMode}
              onChange={(event) => saveLocalPreference({ largerTextMode: event.target.checked })}
            />
            Larger text mode
          </label>
        </SectionCard>

        <SectionCard className="p-5">
          <p className="text-xs text-slate-500">ChemDeck {appVersion}</p>
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            <Link href="/privacy" className="font-semibold text-blue-700 hover:underline">Privacy</Link>
            <Link href="/terms" className="font-semibold text-blue-700 hover:underline">Terms</Link>
            <Link href="/cookies" className="font-semibold text-blue-700 hover:underline">Cookies</Link>
          </div>
        </SectionCard>

        <div className="flex flex-wrap gap-3">
          <Link href={backHref} className={buttonClass.secondary}>Back to dashboard</Link>
          <button type="button" onClick={() => void handleLogout()} className={buttonClass.primary}>
            <LogOut className="mr-2 h-4 w-4" />
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Settings, Sun } from 'lucide-react';
import ThemeSettingsSection from '@/components/ThemeSettingsSection';
import { PageHeader, SectionCard, buttonClass } from '@/components/OperationsUI';
import { appVersion } from '@/lib/generatedVersion';
import { getStoredSession } from '@/lib/appAccounts';

export default function DevSettingsPanel() {
  const searchParams = useSearchParams();
  const companyId = searchParams.get('companyId');
  const session = getStoredSession();
  const backHref = companyId ? `/dev-dashboard?companyId=${encodeURIComponent(companyId)}` : '/dev-dashboard';

  return (
    <div className="pb-24 lg:pb-8">
      <PageHeader
        eyebrow="Dev Console"
        title="Settings"
        description="Your account and display preferences."
        icon={<Settings className="h-4 w-4" />}
      />

      <div className="space-y-5">
        <SectionCard className="p-5">
          <div className="mb-4 flex items-center gap-2 text-slate-700">
            <Settings className="h-5 w-5" />
            <h2 className="text-base font-semibold text-slate-950">Dev session</h2>
          </div>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Account</dt>
              <dd className="mt-1 font-semibold text-slate-900">{session?.name || 'ChemDeck Dev'}</dd>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Username</dt>
              <dd className="mt-1 font-semibold text-slate-900">{session?.username || 'ChemDeckDev'}</dd>
            </div>
          </dl>
        </SectionCard>

        <SectionCard className="p-5">
          <div className="mb-4 flex items-center gap-2 text-slate-700">
            <Sun className="h-5 w-5" />
            <h2 className="text-base font-semibold text-slate-950">Display</h2>
          </div>
          <ThemeSettingsSection />
        </SectionCard>

        <SectionCard className="p-5">
          <p className="text-xs text-slate-500">ChemDeck {appVersion}</p>
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            <Link href="/privacy" className="font-semibold text-blue-700 hover:underline">Privacy</Link>
            <Link href="/terms" className="font-semibold text-blue-700 hover:underline">Terms</Link>
            <Link href="/cookies" className="font-semibold text-blue-700 hover:underline">Cookies</Link>
          </div>
        </SectionCard>

        <Link href={backHref} className={buttonClass.secondary}>
          Back to Dev Dash
        </Link>
      </div>
    </div>
  );
}

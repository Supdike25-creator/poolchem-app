import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { getServerAppSession } from '@/lib/serverAppSession';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveDevCompanyId, readDevCompanies } from '@/lib/devTools';
import DevBranchingPanel from '@/components/dev/DevBranchingPanel';
import DevSettingsPanel from '@/components/dev/DevSettingsPanel';
import DevShell from '@/components/dev/DevShell';

export const dynamic = 'force-dynamic';

export default async function DevSettingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ companyId?: string }>;
}) {
  const session = await getServerAppSession();

  if (session?.role !== 'dev') {
    redirect('/dashboard');
  }

  const params = await searchParams;
  const rawCompanyId = params?.companyId?.trim() ?? '';
  const supabase = createAdminClient();
  const selectedCompanyId = rawCompanyId ? (await resolveDevCompanyId(supabase, rawCompanyId)) ?? '' : '';

  if (rawCompanyId && selectedCompanyId && rawCompanyId !== selectedCompanyId) {
    redirect(`/dev-dashboard/settings?companyId=${encodeURIComponent(selectedCompanyId)}`);
  }

  if (rawCompanyId && !selectedCompanyId) {
    redirect('/dev-dashboard/settings');
  }

  const companies = await readDevCompanies();

  return (
    <DevShell>
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
        <DevBranchingPanel companies={companies} initialCompanyId={selectedCompanyId} />
        <Suspense fallback={<div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading settings…</div>}>
          <DevSettingsPanel />
        </Suspense>
      </div>
    </DevShell>
  );
}

import { Suspense } from 'react';
import AuthShell from '@/components/AuthShell';
import { resolveCompanyScopeId } from '@/lib/resolveCompanyScopeId';
import GuardHomePage from '../guard/page';

export const dynamic = 'force-dynamic';

export default async function WorkerViewPage({
  searchParams,
}: {
  searchParams?: Promise<{ companyId?: string }>;
}) {
  const params = await searchParams;
  const companyId = await resolveCompanyScopeId(params?.companyId);

  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-sm text-slate-600">Loading worker view...</div>}>
      <AuthShell role="guard">
        <GuardHomePage devCompanyId={companyId} />
      </AuthShell>
    </Suspense>
  );
}

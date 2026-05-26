import { Suspense } from 'react';
import AuthShell from '@/components/AuthShell';
import { resolveCompanyScopeId } from '@/lib/resolveCompanyScopeId';
import Dashboard from '../dashboard/page';

export const dynamic = 'force-dynamic';

export default async function ManagerViewPage({
  searchParams,
}: {
  searchParams?: Promise<{ companyId?: string }>;
}) {
  const params = await searchParams;
  const companyId = await resolveCompanyScopeId(params?.companyId);

  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-sm text-slate-600">Loading manager view...</div>}>
      <AuthShell role="manager">
        <Dashboard devCompanyId={companyId} />
      </AuthShell>
    </Suspense>
  );
}

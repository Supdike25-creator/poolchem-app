import AuthShell from '@/components/AuthShell';
import Dashboard from '../dashboard/page';

export const dynamic = 'force-dynamic';

export default async function BossViewPage({
  searchParams,
}: {
  searchParams?: Promise<{ companyId?: string }>;
}) {
  const params = await searchParams;
  const companyId = params?.companyId;

  return (
    <AuthShell role="manager">
      <Dashboard devCompanyId={companyId} />
    </AuthShell>
  );
}

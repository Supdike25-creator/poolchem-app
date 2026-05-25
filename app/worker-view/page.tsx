import AuthShell from '@/components/AuthShell';
import GuardHomePage from '../guard/page';

export const dynamic = 'force-dynamic';

export default async function WorkerViewPage({
  searchParams,
}: {
  searchParams?: Promise<{ companyId?: string }>;
}) {
  const params = await searchParams;
  const companyId = params?.companyId;

  return (
    <AuthShell role="guard">
      <GuardHomePage devCompanyId={companyId} />
    </AuthShell>
  );
}

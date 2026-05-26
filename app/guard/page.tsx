import Dashboard from '../dashboard/page';

export const dynamic = 'force-dynamic';

export default function GuardHomePage({ devCompanyId }: { devCompanyId?: string } = {}) {
  return <Dashboard variant="guard" devCompanyId={devCompanyId} />;
}

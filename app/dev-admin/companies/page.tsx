import DevShell from '@/components/dev/DevShell';
import CompanyAdminCard from '@/components/dev/CompanyAdminCard';
import { loadCompanies, requireDev } from '@/lib/devAdmin';

export const dynamic = 'force-dynamic';

export default async function DevAdminCompaniesPage() {
  await requireDev();
  const companies = await loadCompanies();

  return (
    <DevShell>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold text-slate-950">Admin Panel: Companies</h1>
        <div className="mt-5 grid gap-4">
          {companies.map((company) => (
            <CompanyAdminCard key={company.id} company={company} />
          ))}
        </div>
      </div>
    </DevShell>
  );
}

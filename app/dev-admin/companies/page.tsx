import DevShell from '@/components/dev/DevShell';
import CompanyAdminCard from '@/components/dev/CompanyAdminCard';
import CreateCompanyForm from '@/components/dev/CreateCompanyForm';
import { loadCompanies, requireDev } from '@/lib/devAdmin';

export const dynamic = 'force-dynamic';

export default async function DevAdminCompaniesPage() {
  await requireDev();
  const companies = await loadCompanies();

  return (
    <DevShell>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold text-slate-950">Admin Panel: Companies</h1>
        <CreateCompanyForm />
        {companies.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-600">
            No companies yet. Create one above to start testing manager and employee flows.
          </div>
        ) : (
          <div className="grid gap-4">
            {companies.map((company) => (
              <CompanyAdminCard key={company.id} company={company} />
            ))}
          </div>
        )}
      </div>
    </DevShell>
  );
}

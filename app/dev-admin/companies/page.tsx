import DevShell from '@/components/dev/DevShell';
import AdminActionPanel from '@/components/dev/AdminActionPanel';
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
            <article key={company.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">{company.company_name}</h2>
                  <div className="mt-2 grid gap-2 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-5">
                    <span>Code: <strong className="text-slate-900">{company.company_code}</strong></span>
                    <span>Created by: <span className="font-mono text-xs">{company.created_by ?? '-'}</span></span>
                    <span>Users: {company.user_count}</span>
                    <span>Pools: {company.pool_count}</span>
                    <span className="font-mono text-xs">ID: {company.id}</span>
                  </div>
                </div>
                <AdminActionPanel scope="company" id={company.id} />
              </div>
            </article>
          ))}
        </div>
      </div>
    </DevShell>
  );
}

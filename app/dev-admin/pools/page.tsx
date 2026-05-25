import DevShell from '@/components/dev/DevShell';
import AdminActionPanel from '@/components/dev/AdminActionPanel';
import { loadPools, requireDev } from '@/lib/devAdmin';

export const dynamic = 'force-dynamic';

export default async function DevAdminPoolsPage() {
  await requireDev();
  const pools = await loadPools();

  return (
    <DevShell>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold text-slate-950">Admin Panel: Pools</h1>
        <div className="mt-5 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-3">Pool</th>
                  <th className="px-3 py-3">Company</th>
                  <th className="px-3 py-3">Location</th>
                  <th className="px-3 py-3">ID</th>
                  <th className="px-3 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {pools.map((pool) => (
                  <tr key={pool.id}>
                    <td className="px-3 py-3 font-semibold text-slate-900">{pool.name}</td>
                    <td className="px-3 py-3">{pool.company_name ?? pool.company_id ?? '-'}</td>
                    <td className="px-3 py-3">{pool.location ?? pool.pool_type ?? '-'}</td>
                    <td className="px-3 py-3 font-mono text-xs">{pool.id}</td>
                    <td className="px-3 py-3"><AdminActionPanel scope="pool" id={pool.id} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DevShell>
  );
}

import Link from 'next/link';
import { getSupabaseClient } from '../../../lib/supabaseClient';

export const dynamic = 'force-dynamic';

interface Pool {
  id: string;
  name: string;
  pool_type?: string | null;
  volume_gallons?: number | null;
}

export default async function ManagementPoolsPage() {
  const supabase = getSupabaseClient();
  const { data: pools, error } = await supabase
    .from('pools')
    .select('id,name,pool_type,volume_gallons')
    .order('name');

  if (error) {
    throw new Error(`Unable to fetch pools: ${error.message}`);
  }

  const poolList: Pool[] = pools ?? [];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-8">
          <div>
            <p className="text-sm text-slate-500 uppercase tracking-wide">Management</p>
            <h1 className="text-3xl font-semibold text-slate-900">Pool Configuration</h1>
            <p className="mt-2 text-slate-600 max-w-2xl">Create and update managed pools, targets, and dosing rules.</p>
          </div>
          <Link
            href="/management/pools/new"
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Add New Pool
          </Link>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Pool Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Volume</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {poolList.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-sm text-slate-500">
                      No pools configured yet.
                    </td>
                  </tr>
                ) : (
                  poolList.map((pool) => (
                    <tr key={pool.id} className="hover:bg-slate-50 transition-colors duration-150">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">{pool.name}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{pool.pool_type || 'General'}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{pool.volume_gallons ? `${pool.volume_gallons} gal` : 'Unknown'}</td>
                      <td className="px-6 py-4 text-right text-sm font-medium">
                        <Link href={`/management/pools/${pool.id}`} className="text-blue-600 hover:text-blue-800">
                          Edit
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

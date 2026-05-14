import Link from 'next/link';
import { getSupabaseClient } from '../../../lib/supabaseClient';
import { temporaryLoginBypass } from '../../../lib/temporaryLoginBypass';
import BackButton from '../../../components/BackButton';

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

  if (error && !temporaryLoginBypass) {
    throw new Error(`Unable to fetch pools: ${error.message}`);
  }

  const poolList: Pool[] = error ? [] : pools ?? [];

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
            </svg>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Management</p>
              <h1 className="text-2xl font-bold text-slate-900">Pool Configuration</h1>
            </div>
          </div>
          <p className="mt-3 text-slate-600 max-w-2xl">Create and update managed pools, targets, and dosing rules.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <BackButton fallbackHref="/management/dashboard" label="Back" />
          <Link
            href="/management/pools/new"
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add New Pool
          </Link>
        </div>
      </div>
      {temporaryLoginBypass && error ? (
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          Login bypass is active, so live Supabase pool data may be hidden until the auth work is finished.
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-blue-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-blue-600">Pool Name</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-blue-600">Type</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-blue-600">Volume</th>
                <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wide text-blue-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {poolList.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-sm text-slate-500">
                    <div className="flex flex-col items-center gap-3">
                      <svg className="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                      </svg>
                      <p>No pools configured yet.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                poolList.map((pool) => (
                  <tr key={pool.id} className="hover:bg-blue-50 transition-colors duration-150">
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{pool.name}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{pool.pool_type || 'General'}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{pool.volume_gallons ? `${pool.volume_gallons} gal` : 'Unknown'}</td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      <Link href={`/management/pools/${pool.id}/edit`} className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
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
  );
}

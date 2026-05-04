import Link from 'next/link';
import { getSupabaseClient } from '../../../lib/supabaseClient';

export const dynamic = 'force-dynamic';

interface ChemicalLog {
  id: string;
  pool_id: string;
  free_chlorine: number;
  ph: number;
  notes: string | null;
  created_at: string;
}

export default async function ManagementLogsPage() {
  const supabase = getSupabaseClient();
  const { data: logs, error } = await supabase
    .from('chemical_logs')
    .select('id,pool_id,free_chlorine,ph,notes,created_at')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(`Unable to fetch logs: ${error.message}`);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-8">
          <div>
            <p className="text-sm text-slate-500 uppercase tracking-wide">Management</p>
            <h1 className="text-3xl font-semibold text-slate-900">Recent Logs</h1>
            <p className="mt-2 text-slate-600 max-w-2xl">Review the most recent chemical logs submitted by your guard team.</p>
          </div>
          <Link href="/management/dashboard" className="inline-flex items-center justify-center rounded-lg bg-white border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Back to Dashboard
          </Link>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Pool ID</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Chlorine</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">pH</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Notes</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {(logs ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-sm text-slate-500">
                      No logs submitted yet.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors duration-150">
                      <td className="px-6 py-4 text-sm text-slate-900">{log.pool_id}</td>
                      <td className="px-6 py-4 text-sm text-slate-900">{log.free_chlorine.toFixed(1)} ppm</td>
                      <td className="px-6 py-4 text-sm text-slate-900">{log.ph.toFixed(1)}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{log.notes || '—'}</td>
                      <td className="px-6 py-4 text-sm text-slate-500">{new Date(log.created_at).toLocaleString()}</td>
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

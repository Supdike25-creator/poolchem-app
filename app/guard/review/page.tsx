import Link from 'next/link';
import BackButton from '../../../components/BackButton';
import { getSupabaseClient } from '../../../lib/supabaseClient';

interface ChemicalLogRow {
  id: string;
  pool_id: string;
  user_id?: string | null;
  free_chlorine?: number | null;
  ph?: number | null;
  notes?: string | null;
  logged_at?: string | null;
  created_at: string;
}

export const dynamic = 'force-dynamic';

const getLogTime = (log: ChemicalLogRow) => new Date(log.logged_at || log.created_at);

const getStatus = (log: ChemicalLogRow) => {
  if (typeof log.free_chlorine !== 'number' || typeof log.ph !== 'number') {
    return { label: 'Logged', className: 'bg-slate-100 text-slate-700 border-slate-200' };
  }

  if (log.free_chlorine < 1 || log.free_chlorine > 4 || log.ph < 7.2 || log.ph > 7.8) {
    return { label: 'Needs Review', className: 'bg-red-100 text-red-800 border-red-200' };
  }

  return { label: 'In Range', className: 'bg-green-100 text-green-800 border-green-200' };
};

const formatTime = (value: Date) => value.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

export default async function GuardReviewPage({ searchParams }: { searchParams: Promise<{ sheet?: string; poolId?: string; chlorine?: string; ph?: string }> }) {
  const params = await searchParams;
  const isFullSheet = params?.sheet === 'full';
  const supabase = getSupabaseClient();

  const { data: pools } = await supabase
    .from('pools')
    .select('id,name')
    .order('name');

  const poolMap = new Map(pools?.map((pool) => [pool.id, pool.name]) || []);

  const now = new Date();
  const rangeStart = new Date(now);
  rangeStart.setMinutes(0, 0, 0);
  const rangeEnd = new Date(rangeStart);
  rangeEnd.setHours(rangeEnd.getHours() + 1);

  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const query = supabase
    .from('chemical_logs')
    .select('id,pool_id,user_id,free_chlorine,ph,notes,logged_at,created_at')
    .gte('created_at', (isFullSheet ? dayStart : rangeStart).toISOString())
    .lt('created_at', (isFullSheet ? dayEnd : rangeEnd).toISOString())
    .order('created_at', { ascending: false });

  const { data: logs, error } = await query;

  if (error) {
    throw new Error(`Unable to load guard logs: ${error.message}`);
  }

  const guardLogs = (logs ?? []) as ChemicalLogRow[];
  const title = isFullSheet ? 'Full Guard Sheet' : 'Current Hour Logs';
  const subtitle = isFullSheet
    ? 'All of your submitted logs for today.'
    : `Only logs submitted from ${formatTime(rangeStart)} to ${formatTime(rangeEnd)}.`;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <BackButton fallbackHref="/guard" label="Back" />
            <Link
              href={isFullSheet ? '/guard/review' : '/guard/review?sheet=full'}
              data-sound="click"
              className="inline-flex items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
            >
              {isFullSheet ? 'Current Hour' : 'Full Sheet'}
            </Link>
          </div>
          <Link
            href="/guard/log"
            data-sound="click"
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            New Log
          </Link>
        </div>

        <div className="mb-4">
          <p className="text-sm text-slate-500 uppercase tracking-wide">Guard</p>
          <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">{subtitle}</p>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Pool</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Free Chlorine</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">pH</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Notes</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Edit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {guardLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-sm text-slate-500">
                      No logs in this view yet.
                    </td>
                  </tr>
                ) : (
                  guardLogs.map((log) => {
                    const status = getStatus(log);

                    return (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{formatTime(getLogTime(log))}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-slate-900">{poolMap.get(log.pool_id) || log.pool_id}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-900">{typeof log.free_chlorine === 'number' ? `${log.free_chlorine.toFixed(1)} ppm` : '—'}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-900">{typeof log.ph === 'number' ? log.ph.toFixed(1) : '—'}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm">
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${status.className}`}>{status.label}</span>
                        </td>
                        <td className="max-w-sm truncate px-4 py-3 text-sm text-slate-600">{log.notes || '—'}</td>
                        <td className="px-4 py-3 text-right text-sm">
                          <Link href={`/guard/log?poolId=${log.pool_id}`} data-sound="click" className="font-semibold text-blue-600 hover:text-blue-800">
                            Edit
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {params?.poolId || params?.chlorine || params?.ph ? (
          <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm font-semibold text-blue-900">Latest submitted values</p>
            <p className="mt-1 text-sm text-blue-700">
              Pool: {params.poolId || '—'} · Chlorine: {params.chlorine || '—'} · pH: {params.ph || '—'}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

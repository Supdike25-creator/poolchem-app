import Link from 'next/link';
import { getSupabaseClient } from '../../../lib/supabaseClient';

export const dynamic = 'force-dynamic';

interface Pool {
  id: string;
  name: string;
}

interface ChemicalLog {
  id: string;
  pool_id: string;
  free_chlorine: number;
  ph: number;
  notes: string | null;
  created_at: string;
}

type PoolStatus = 'good' | 'high_chlorine' | 'low_chlorine' | 'ph_warning' | 'overdue';

const getPoolStatus = (latestLog?: ChemicalLog): PoolStatus => {
  if (!latestLog) {
    return 'overdue';
  }

  const testTime = new Date(latestLog.created_at);
  const now = new Date();
  const minutesSinceTest = (now.getTime() - testTime.getTime()) / (1000 * 60);

  if (minutesSinceTest > 60) {
    return 'overdue';
  }

  const chlorine = latestLog.free_chlorine;
  const ph = latestLog.ph;

  if (chlorine > 4) {
    return 'high_chlorine';
  }

  if (chlorine < 1) {
    return 'low_chlorine';
  }

  if (ph < 7.2 || ph > 7.8) {
    return 'ph_warning';
  }

  return 'good';
};

const getStatusColor = (status: PoolStatus) => {
  switch (status) {
    case 'good':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'high_chlorine':
    case 'low_chlorine':
    case 'ph_warning':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'overdue':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
};

const getStatusText = (status: PoolStatus) => {
  switch (status) {
    case 'good':
      return 'Good';
    case 'high_chlorine':
      return 'High Chlorine';
    case 'low_chlorine':
      return 'Low Chlorine';
    case 'ph_warning':
      return 'High/Low pH';
    case 'overdue':
      return 'Overdue';
    default:
      return 'Unknown';
  }
};

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

export default async function ManagementDashboard() {
  const supabase = getSupabaseClient();

  const { data: pools, error: poolsError } = await supabase
    .from('pools')
    .select('id,name')
    .order('name');

  if (poolsError) {
    throw new Error(`Unable to load pools: ${poolsError.message}`);
  }

  const { data: recentLogs, error: logsError } = await supabase
    .from('chemical_logs')
    .select('id,pool_id,free_chlorine,ph,notes,created_at')
    .order('created_at', { ascending: false })
    .limit(200);

  if (logsError) {
    throw new Error(`Unable to load logs: ${logsError.message}`);
  }

  const poolList = pools ?? [];
  const logs = recentLogs ?? [];

  const latestLogByPool = new Map<string, ChemicalLog>();
  for (const log of logs) {
    if (!latestLogByPool.has(log.pool_id)) {
      latestLogByPool.set(log.pool_id, log);
    }
  }

  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const testsToday = logs.filter((log) => new Date(log.created_at) >= dayStart).length;

  const poolsWithStatus = poolList.map((pool) => {
    const latestLog = latestLogByPool.get(pool.id);
    return {
      ...pool,
      latestLog,
      status: getPoolStatus(latestLog),
    };
  });

  const totalPools = poolsWithStatus.length;
  const goodPools = poolsWithStatus.filter((pool) => pool.status === 'good').length;
  const outOfRangePools = poolsWithStatus.filter((pool) => ['high_chlorine', 'low_chlorine', 'ph_warning'].includes(pool.status)).length;
  const overduePools = poolsWithStatus.filter((pool) => pool.status === 'overdue').length;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-8">
          <div>
            <p className="text-sm text-slate-500 uppercase tracking-wide">Management</p>
            <h1 className="text-3xl font-semibold text-slate-900">Management Dashboard</h1>
            <p className="mt-2 text-slate-600 max-w-2xl">See the current chemical status for every pool and manage settings centrally.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/management/pools" className="inline-flex items-center justify-center rounded-lg bg-white border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Manage Pools
            </Link>
            <Link href="/management/logs" className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              View Logs
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          <div className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm">
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Total Pools</p>
            <p className="mt-4 text-3xl font-semibold text-slate-900">{totalPools}</p>
          </div>
          <div className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm">
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Good</p>
            <p className="mt-4 text-3xl font-semibold text-green-700">{goodPools}</p>
          </div>
          <div className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm">
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Out of Range</p>
            <p className="mt-4 text-3xl font-semibold text-red-700">{outOfRangePools}</p>
          </div>
          <div className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm">
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Tests Today</p>
            <p className="mt-4 text-3xl font-semibold text-violet-700">{testsToday}</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 bg-slate-50 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Pool Status Table</h2>
            <p className="mt-1 text-sm text-slate-600">Quick view of the latest pool log and chemistry status.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-white">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Pool</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Last Test</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Chlorine</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">pH</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Notes</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {poolsWithStatus.map((pool) => (
                  <tr key={pool.id} className="hover:bg-slate-50 transition-colors duration-150">
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{pool.name}</td>
                    <td className="px-6 py-4 text-sm text-slate-500 whitespace-nowrap">
                      {pool.latestLog ? formatDateTime(pool.latestLog.created_at) : 'No logs'}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900 whitespace-nowrap">
                      {pool.latestLog ? `${pool.latestLog.free_chlorine.toFixed(1)} ppm` : '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900 whitespace-nowrap">
                      {pool.latestLog ? pool.latestLog.ph.toFixed(1) : '—'}
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold border ${getStatusColor(pool.status)}`}>
                        {getStatusText(pool.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 truncate max-w-xs">
                      {pool.latestLog?.notes || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

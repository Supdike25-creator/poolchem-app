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
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-8">
        <div>
          <div className="flex items-center gap-3">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Management</p>
              <h1 className="text-3xl font-bold text-slate-900">Management Dashboard</h1>
            </div>
          </div>
          <p className="mt-3 text-slate-600 max-w-2xl">See the current chemical status for every pool and manage settings centrally.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/management/pools" className="inline-flex items-center justify-center rounded-xl bg-white border border-blue-200 px-5 py-3 text-sm font-medium text-slate-700 hover:bg-blue-50 hover:border-blue-300 transition-colors">
            <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
            </svg>
            Manage Pools
          </Link>
          <Link href="/management/logs" className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            View Logs
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl border border-blue-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-600 uppercase tracking-wide">Total Pools</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{totalPools}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-green-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-green-600 uppercase tracking-wide">Good</p>
              <p className="mt-2 text-3xl font-bold text-green-700">{goodPools}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-red-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-red-600 uppercase tracking-wide">Out of Range</p>
              <p className="mt-2 text-3xl font-bold text-red-700">{outOfRangePools}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-violet-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-violet-600 uppercase tracking-wide">Tests Today</p>
              <p className="mt-2 text-3xl font-bold text-violet-700">{testsToday}</p>
            </div>
            <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-blue-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 bg-blue-50 border-b border-blue-200">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Pool Status Table</h2>
              <p className="text-sm text-slate-600">Quick view of the latest pool log and chemistry status.</p>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Pool</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Last Test</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Chlorine</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">pH</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Notes</th>
              </tr>
            </thead>
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Pool</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Last Test</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Chlorine</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">pH</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Notes</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {poolsWithStatus.map((pool) => (
                <tr key={pool.id} className="hover:bg-blue-50 transition-colors duration-150">
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
  );
}

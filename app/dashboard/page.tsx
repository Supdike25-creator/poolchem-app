import React from 'react';
import Link from 'next/link';
import { getSupabaseClient } from '../../lib/supabaseClient';
import BackButton from '../../components/BackButton';

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
  photo_url: string | null;
  created_at: string;
}

type PoolStatus = 'good' | 'high_chlorine' | 'low_chlorine' | 'ph_warning' | 'overdue';

const getPoolStatus = (latestLog?: ChemicalLog): PoolStatus => {
  if (!latestLog) {
    return 'overdue';
  }

  // Check if test is overdue (no test in last 60 minutes)
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
      return 'bg-gray-100 text-gray-700 border-gray-200';
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
      return 'pH Warning';
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
    timeStyle: 'short'
  });
};

const dashboardTabs = [
  { label: 'Overview', href: '/dashboard', active: true },
  { label: 'Submit Log', href: '/log' },
  { label: 'Review Logs', href: '/management/logs' },
  { label: 'Pools', href: '/management/pools' },
  { label: 'Announcements', href: '/management/announcements' },
  { label: 'Settings', href: '/management/settings' },
];

const DashboardHotBar = () => (
  <nav className="mb-6 rounded-lg border border-slate-200 bg-white/95 shadow-sm" aria-label="Dashboard sections">
    <div className="flex items-center gap-2 overflow-x-auto px-3 py-3">
      <BackButton fallbackHref="/" label="Back" />
      {dashboardTabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          data-sound="click"
          className={`whitespace-nowrap rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
            tab.active
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-700 hover:bg-blue-50 hover:text-blue-700'
          }`}
          aria-current={tab.active ? 'page' : undefined}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  </nav>
);

export default async function Dashboard() {
  let poolsWithStatus: Array<{
    id: string;
    name: string;
    latestLog?: ChemicalLog;
    status: PoolStatus;
  }> = [];
  let totalPools = 0;
  let goodPools = 0;
  let outOfRangePools = 0;
  let overduePools = 0;
  let testsToday = 0;
  let errorMessage = '';
  let hasNoPools = false;

  try {
    const supabase = getSupabaseClient();

    // Fetch all pools
    const { data: pools, error: poolsError } = await supabase
      .from('pools')
      .select('id, name')
      .order('name');

    if (poolsError) {
      throw new Error(`Failed to fetch pools: ${poolsError.message}`);
    }

    const poolList: Pool[] = pools ?? [];

    if (poolList.length === 0) {
      hasNoPools = true;
    }

    if (!hasNoPools) {
      // Fetch recent logs for all pools
      const { data: recentLogs, error: logsError } = await supabase
        .from('chemical_logs')
        .select('id, pool_id, free_chlorine, ph, notes, photo_url, created_at')
        .order('created_at', { ascending: false });

      if (logsError) {
        throw new Error(`Failed to fetch logs: ${logsError.message}`);
      }

      const allLogs: ChemicalLog[] = recentLogs ?? [];

      // Count tests from today
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      testsToday = allLogs.filter(log => new Date(log.created_at) >= todayStart).length;

      // Group logs by pool and get the latest for each
      const latestLogByPool = new Map<string, ChemicalLog>();
      for (const log of allLogs) {
        if (!latestLogByPool.has(log.pool_id)) {
          latestLogByPool.set(log.pool_id, log);
        }
      }

      // Create pool data with status
      poolsWithStatus = poolList.map(pool => {
        const latestLog = latestLogByPool.get(pool.id);
        const status = getPoolStatus(latestLog);
        return {
          ...pool,
          latestLog,
          status
        };
      });

      // Calculate summary stats
      totalPools = poolsWithStatus.length;
      goodPools = poolsWithStatus.filter(p => p.status === 'good').length;
      outOfRangePools = poolsWithStatus.filter(p => ['high_chlorine', 'low_chlorine', 'ph_warning'].includes(p.status)).length;
      overduePools = poolsWithStatus.filter(p => p.status === 'overdue').length;

      // Sort pools: Overdue and unsafe first, then by status priority
      const statusPriority = {
        overdue: 0,
        high_chlorine: 1,
        low_chlorine: 1,
        ph_warning: 1,
        good: 2
      };

      poolsWithStatus.sort((a, b) => {
        const priorityA = statusPriority[a.status];
        const priorityB = statusPriority[b.status];
        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }
        return a.name.localeCompare(b.name);
      });
    }
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : String(error);
  }

  if (errorMessage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <DashboardHotBar />
          <div className="bg-red-50 border border-red-200 rounded-xl p-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-red-800">Connection Error</h3>
                <p className="mt-2 text-sm text-red-700">
                  Unable to load pool data. Please check your connection or try again later.
                </p>
                <p className="mt-2 text-xs text-red-600 font-mono">{errorMessage}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (hasNoPools) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <DashboardHotBar />
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900">Pool Operations Dashboard</h1>
            <p className="mt-2 text-slate-600">Real-time pool chemistry monitoring and management</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m0 0l8 4m-8-4v10l8 4m0-10l8 4m-8-4l8-4" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">No Pools Configured</h2>
            <p className="text-slate-600 mb-6">Get started by creating your first pool in the admin panel.</p>
            <Link
              href="/admin"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
            >
              Go to Admin Settings
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (

    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DashboardHotBar />
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Pool Operations Dashboard</h1>
              <p className="mt-2 text-slate-600">Real-time pool chemistry monitoring and management</p>
            </div>
            <Link
              href="/log"
              data-sound="click"
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <svg className="mr-2 -ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Submit Log
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Pools</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{totalPools}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Good Status</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{goodPools}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Out of Range</p>
                <p className="text-3xl font-bold text-red-600 mt-2">{outOfRangePools}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Overdue</p>
                <p className="text-3xl font-bold text-orange-600 mt-2">{overduePools}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Tests Today</p>
                <p className="text-3xl font-bold text-purple-600 mt-2">{testsToday}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 sm:px-6 sm:py-5 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50">
            <h2 className="text-lg font-semibold text-slate-900">Pool Status Overview</h2>
            <p className="mt-1 text-sm text-slate-600">Monitor chemical levels and testing schedules</p>
          </div>

          {poolsWithStatus.length === 0 ? (
            <div className="px-6 py-12 sm:px-8 text-center">
              <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <h3 className="mt-4 text-sm font-medium text-slate-900">No tests recorded yet</h3>
              <p className="mt-2 text-sm text-slate-500">Start by submitting a chemical log from the pools.</p>
              <Link
                href="/log"
                data-sound="click"
                className="mt-4 inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              >
                Submit First Log
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Pool
                    </th>
                    <th className="hidden sm:table-cell px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Last Test
                    </th>
                    <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Chlorine
                    </th>
                    <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      pH
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {poolsWithStatus.map((pool) => {
                    const { latestLog, status } = pool;
                    return (
                      <tr key={pool.id} className="hover:bg-slate-50 transition-colors duration-150">
                        <td className="px-4 sm:px-6 py-4 text-sm font-medium text-slate-900">
                          <div className="flex flex-col">
                            <span>{pool.name}</span>
                            <span className="sm:hidden text-xs text-slate-500 mt-1">
                              {latestLog ? formatDateTime(latestLog.created_at) : 'Never tested'}
                            </span>
                          </div>
                        </td>
                        <td className="hidden sm:table-cell px-6 py-4 text-sm text-slate-500 whitespace-nowrap">
                          {latestLog ? formatDateTime(latestLog.created_at) : 'Never'}
                        </td>
                        <td className="hidden md:table-cell px-6 py-4 text-sm text-slate-900 font-mono">
                          {latestLog ? latestLog.free_chlorine.toFixed(1) : '—'} ppm
                        </td>
                        <td className="hidden md:table-cell px-6 py-4 text-sm text-slate-900 font-mono">
                          {latestLog ? latestLog.ph.toFixed(1) : '—'}
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full border ${getStatusColor(status)}`}>
                            {getStatusText(status)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

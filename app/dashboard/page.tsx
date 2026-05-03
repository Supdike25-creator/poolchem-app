import React from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

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

export default async function Dashboard() {
  // Fetch all pools
  const { data: pools, error: poolsError } = await supabase
    .from('pools')
    .select('id, name')
    .order('name');

  // Fetch recent logs for all pools
  const { data: recentLogs, error: logsError } = await supabase
    .from('chemical_logs')
    .select('id, pool_id, free_chlorine, ph, notes, photo_url, created_at')
    .order('created_at', { ascending: false });

  if (poolsError) {
    console.error('Supabase pools error:', poolsError);
  }

  if (logsError) {
    console.error('Supabase chemical_logs error:', logsError);
  }

  const poolList: Pool[] = pools ?? [];
  const allLogs: ChemicalLog[] = recentLogs ?? [];

  // Group logs by pool and get the latest for each
  const latestLogByPool = new Map<string, ChemicalLog>();
  for (const log of allLogs) {
    if (!latestLogByPool.has(log.pool_id)) {
      latestLogByPool.set(log.pool_id, log);
    }
  }

  // Create pool data with status
  const poolsWithStatus = poolList.map(pool => {
    const latestLog = latestLogByPool.get(pool.id);
    const status = getPoolStatus(latestLog);
    return {
      ...pool,
      latestLog,
      status
    };
  });

  // Calculate summary stats
  const totalPools = poolsWithStatus.length;
  const goodPools = poolsWithStatus.filter(p => p.status === 'good').length;
  const warningPools = poolsWithStatus.filter(p => ['high_chlorine', 'low_chlorine', 'ph_warning'].includes(p.status)).length;
  const overduePools = poolsWithStatus.filter(p => p.status === 'overdue').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Pool Operations Dashboard</h1>
              <p className="mt-2 text-slate-600">Real-time pool chemistry monitoring and management</p>
            </div>
            <Link
              href="/log"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <svg className="mr-2 -ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Submit Log
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Total Pools</p>
                <p className="text-2xl font-bold text-slate-900">{totalPools}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center shadow-sm">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Good Pools</p>
                <p className="text-2xl font-bold text-slate-900">{goodPools}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center shadow-sm">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Warning Pools</p>
                <p className="text-2xl font-bold text-slate-900">{warningPools}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center shadow-sm">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Overdue Pools</p>
                <p className="text-2xl font-bold text-slate-900">{overduePools}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50">
            <h2 className="text-lg font-semibold text-slate-900">Pool Status Overview</h2>
            <p className="mt-1 text-sm text-slate-600">Monitor chemical levels and testing schedules</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Pool Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Last Test Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Free Chlorine (ppm)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    pH
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {poolsWithStatus.map((pool) => {
                  const { latestLog, status } = pool;
                  return (
                    <tr key={pool.id} className="hover:bg-slate-50 transition-colors duration-150">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                        {pool.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {latestLog ? formatDateTime(latestLog.created_at) : 'Never tested'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-mono">
                        {latestLog ? latestLog.free_chlorine.toFixed(1) : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-mono">
                        {latestLog ? latestLog.ph.toFixed(1) : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full border ${getStatusColor(status)}`}>
                          {getStatusText(status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate">
                        {latestLog?.notes || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

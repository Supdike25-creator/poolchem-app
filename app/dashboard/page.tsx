import React from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { AlertCircle, ClipboardCheck, Clock3, Plus, Waves } from 'lucide-react';
import { EmptyState, StatCard, StatusBadge, buttonClass, type StatusTone } from '../../components/OperationsUI';

export const dynamic = 'force-dynamic';

interface Pool {
  id: string;
  name: string;
}

interface ChemicalLog {
  id: string;
  pool_id: string;
  submitted_by?: string | null;
  free_chlorine: number;
  ph: number;
  notes: string | null;
  photo_url: string | null;
  created_at: string;
}

interface ProfileSummary {
  id: string;
  full_name?: string | null;
  email?: string | null;
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

const getStatusColor = (status: PoolStatus): StatusTone => {
  switch (status) {
    case 'good':
      return 'good';
    case 'high_chlorine':
    case 'low_chlorine':
      return 'critical';
    case 'ph_warning':
      return 'warning';
    case 'overdue':
      return 'overdue';
    default:
      return 'neutral';
  }
};

const getStatusText = (status: PoolStatus) => {
  switch (status) {
    case 'good':
      return 'Good';
    case 'high_chlorine':
    case 'low_chlorine':
      return 'Critical';
    case 'ph_warning':
      return 'Warning';
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
  let poolsWithStatus: Array<{
    id: string;
    name: string;
    latestLog?: ChemicalLog;
    status: PoolStatus;
  }> = [];
  let totalPools = 0;
  let outOfRangePools = 0;
  let overduePools = 0;
  let testsToday = 0;
  let errorMessage = '';
  let hasNoPools = false;
  let submitterMap = new Map<string, string>();

  try {
    const supabase = await createClient();

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
        .select('id, pool_id, submitted_by, free_chlorine, ph, notes, photo_url, created_at')
        .order('created_at', { ascending: false });

      if (logsError) {
        throw new Error(`Failed to fetch logs: ${logsError.message}`);
      }

      const allLogs: ChemicalLog[] = recentLogs ?? [];
      const submitterIds = Array.from(new Set(allLogs.map((log) => log.submitted_by).filter(Boolean))) as string[];

      if (submitterIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', submitterIds);

        submitterMap = new Map(
          ((profiles ?? []) as ProfileSummary[]).map((profile) => [
            profile.id,
            profile.full_name || profile.email || profile.id,
          ])
        );
      }

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
      <>
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
      </>
    );
  }

  if (hasNoPools) {
    return (
      <>
          <div className="mb-8">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Pool Operations Dashboard</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">Real-time pool chemistry monitoring and management</p>
          </div>

          <EmptyState
            icon={<Waves className="h-6 w-6" />}
            title="No pools configured"
            description="Create your first pool to start tracking tests, exceptions, and daily operations."
            action={(
              <Link href="/management/pools/new" className={buttonClass.primary}>
                <Plus className="mr-2 h-4 w-4" />
                Add Pool
              </Link>
            )}
          />
      </>
    );
  }

  return (

    <>
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Pool Operations Dashboard</h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">Real-time pool chemistry monitoring and management</p>
            </div>
            <Link
              href="/log"
              data-sound="click"
              className="inline-flex h-9 items-center justify-center rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Submit Log
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Pools" value={totalPools} icon={<Waves className="h-5 w-5" />} tone="info" />
          <StatCard label="Overdue Tests" value={overduePools} icon={<Clock3 className="h-5 w-5" />} tone="overdue" />
          <StatCard label="Out of Range" value={outOfRangePools} icon={<AlertCircle className="h-5 w-5" />} tone="critical" />
          <StatCard label="Tests Today" value={testsToday} icon={<ClipboardCheck className="h-5 w-5" />} tone="info" />
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 sm:px-6 sm:py-5">
            <h2 className="text-lg font-semibold text-slate-950">Pool Status Overview</h2>
            <p className="mt-1 text-sm text-slate-500">Monitor chemical levels and testing schedules</p>
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
                    <th className="hidden lg:table-cell px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Submitted By
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Action
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
                          <StatusBadge tone={getStatusColor(status)}>{getStatusText(status)}</StatusBadge>
                        </td>
                        <td className="hidden lg:table-cell px-6 py-4 text-xs text-slate-500">
                          {latestLog?.submitted_by ? submitterMap.get(latestLog.submitted_by) || 'Unknown' : 'Not recorded'}
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-right">
                          <Link href={`/log?poolId=${pool.id}`} className={buttonClass.secondary}>
                            Log
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
    </>
  );
}

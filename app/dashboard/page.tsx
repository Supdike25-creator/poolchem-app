import React from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { AlertCircle, Camera, CheckCircle2, ClipboardCheck, Clock3, Eye, Info, Plus, Waves } from 'lucide-react';
import { EmptyState, StatCard, StatusBadge, buttonClass, type StatusTone } from '../../components/OperationsUI';

export const dynamic = 'force-dynamic';

interface Pool {
  id: string;
  name: string;
  pool_type?: string | null;
  is_baby_pool?: boolean | null;
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

type PoolStatus = 'good' | 'due_soon' | 'overdue' | 'high_chlorine' | 'low_chlorine' | 'ph_low' | 'ph_high' | 'closed' | 'needs_retest' | 'no_data';

const getPoolStatus = (latestLog?: ChemicalLog): PoolStatus => {
  if (!latestLog) {
    return 'no_data';
  }

  // Check if test is overdue (no test in last 60 minutes)
  const testTime = new Date(latestLog.created_at);
  const now = new Date();
  const minutesSinceTest = (now.getTime() - testTime.getTime()) / (1000 * 60);

  if (minutesSinceTest > 60) {
    return 'overdue';
  }

  if (minutesSinceTest > 45) {
    return 'due_soon';
  }

  const chlorine = latestLog.free_chlorine;
  const ph = latestLog.ph;

  if (chlorine > 4) {
    return 'high_chlorine';
  }

  if (chlorine < 1) {
    return 'low_chlorine';
  }

  if (ph < 7.2) {
    return 'ph_low';
  }

  if (ph > 7.8) {
    return 'ph_high';
  }

  return 'good';
};

const getStatusColor = (status: PoolStatus): StatusTone => {
  switch (status) {
    case 'good':
      return 'good';
    case 'due_soon':
      return 'warning';
    case 'high_chlorine':
    case 'low_chlorine':
    case 'ph_low':
    case 'ph_high':
      return 'critical';
    case 'overdue':
      return 'overdue';
    case 'no_data':
    case 'closed':
    case 'needs_retest':
      return 'neutral';
    default:
      return 'neutral';
  }
};

const getStatusText = (status: PoolStatus) => {
  switch (status) {
    case 'good':
      return 'Good';
    case 'due_soon':
      return 'Due Soon';
    case 'high_chlorine':
      return 'High Chlorine';
    case 'low_chlorine':
      return 'Low Chlorine';
    case 'ph_low':
      return 'pH Low';
    case 'ph_high':
      return 'pH High';
    case 'overdue':
      return 'Overdue';
    case 'closed':
      return 'Closed';
    case 'needs_retest':
      return 'Needs Retest';
    case 'no_data':
      return 'No Data';
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

const formatRelativeDue = (latestLog?: ChemicalLog) => {
  if (!latestLog) {
    return 'Start today';
  }

  const latest = new Date(latestLog.created_at).getTime();
  const dueAt = latest + 60 * 60 * 1000;
  const minutes = Math.round((dueAt - Date.now()) / (1000 * 60));

  if (minutes <= 0) {
    return `${Math.abs(minutes)} min overdue`;
  }

  return `Due in ${minutes} min`;
};

export default async function Dashboard() {
  let poolsWithStatus: Array<{
    id: string;
    name: string;
    pool_type?: string | null;
    is_baby_pool?: boolean | null;
    latestLog?: ChemicalLog;
    status: PoolStatus;
  }> = [];
  let totalPools = 0;
  let outOfRangePools = 0;
  let overduePools = 0;
  let dueSoonPools = 0;
  let goodPools = 0;
  let photosWaitingReview = 0;
  let testsToday = 0;
  let errorMessage = '';
  let hasNoPools = false;
  let submitterMap = new Map<string, string>();

  try {
    const supabase = await createClient();

    // Fetch all pools
    const { data: pools, error: poolsError } = await supabase
      .from('pools')
      .select('id, name, pool_type, is_baby_pool')
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
      outOfRangePools = poolsWithStatus.filter(p => ['high_chlorine', 'low_chlorine', 'ph_low', 'ph_high'].includes(p.status)).length;
      overduePools = poolsWithStatus.filter(p => p.status === 'overdue').length;
      dueSoonPools = poolsWithStatus.filter(p => p.status === 'due_soon').length;
      goodPools = poolsWithStatus.filter(p => p.status === 'good').length;
      photosWaitingReview = allLogs.filter((log) => Boolean(log.photo_url)).length;

      // Sort pools: Overdue and unsafe first, then by status priority
      const statusPriority = {
        overdue: 0,
        high_chlorine: 1,
        low_chlorine: 1,
        ph_low: 1,
        ph_high: 1,
        due_soon: 2,
        needs_retest: 3,
        no_data: 4,
        closed: 5,
        good: 6
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

  const urgentPools = poolsWithStatus.filter((pool) => ['overdue', 'high_chlorine', 'low_chlorine', 'ph_low', 'ph_high'].includes(pool.status));
  const priorityActions = [
    ...poolsWithStatus
      .filter((pool) => pool.status === 'overdue')
      .map((pool) => ({ tone: 'overdue' as StatusTone, title: `${pool.name} is overdue`, detail: 'Submit a chemical test or assign a guard.' })),
    ...poolsWithStatus
      .filter((pool) => pool.is_baby_pool && ['high_chlorine', 'low_chlorine', 'ph_low', 'ph_high'].includes(pool.status))
      .map((pool) => ({ tone: 'critical' as StatusTone, title: `${pool.name} baby pool needs review`, detail: getStatusText(pool.status) })),
    ...poolsWithStatus
      .filter((pool) => pool.latestLog && ['high_chlorine', 'low_chlorine', 'ph_low', 'ph_high'].includes(pool.status) && !pool.latestLog.photo_url)
      .map((pool) => ({ tone: 'warning' as StatusTone, title: `${pool.name} is missing a review photo`, detail: 'Ask staff to attach verification on the next check.' })),
    ...poolsWithStatus
      .filter((pool) => pool.status === 'due_soon')
      .map((pool) => ({ tone: 'warning' as StatusTone, title: `${pool.name} is due soon`, detail: formatRelativeDue(pool.latestLog) })),
  ].slice(0, 5);

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
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Today&apos;s Pool Status</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Pool Operations Dashboard</h1>
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
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Today&apos;s Pool Status</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Pool Operations Dashboard</h1>
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

        <div className={`mb-6 rounded-xl border p-4 ${urgentPools.length > 0 ? 'border-red-200 bg-red-50 text-red-800' : 'border-green-200 bg-green-50 text-green-800'}`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              {urgentPools.length > 0 ? <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />}
              <div>
                <p className="text-sm font-semibold">
                  {urgentPools.length > 0
                    ? `Urgent: ${overduePools} pools overdue and ${outOfRangePools} out of range.`
                    : 'All pools on track'}
                </p>
                <p className="mt-1 text-sm opacity-85">
                  {urgentPools.length > 0 ? 'Review priority actions before the next guard rotation.' : 'No urgent pool chemistry issues are currently flagged.'}
                </p>
              </div>
            </div>
            {urgentPools.length > 0 ? (
              <Link href="#priority-actions" className="inline-flex h-9 items-center justify-center rounded-lg bg-white px-3 text-sm font-semibold text-red-700 shadow-sm ring-1 ring-red-200 hover:bg-red-50">
                View Alerts
              </Link>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 mb-8 sm:grid-cols-2 xl:grid-cols-7">
          <StatCard label="Total Pools" value={totalPools} icon={<Waves className="h-5 w-5" />} tone="info" />
          <StatCard label="Pools Good" value={goodPools} icon={<CheckCircle2 className="h-5 w-5" />} tone="good" />
          <StatCard label="Due Soon" value={dueSoonPools} icon={<Clock3 className="h-5 w-5" />} tone="warning" />
          <StatCard label="Overdue" value={overduePools} icon={<Clock3 className="h-5 w-5" />} tone="overdue" />
          <StatCard label="Out of Range" value={outOfRangePools} icon={<AlertCircle className="h-5 w-5" />} tone="critical" />
          <StatCard label="Tests Today" value={testsToday} icon={<ClipboardCheck className="h-5 w-5" />} tone="info" />
          <StatCard label="Photos Waiting Review" value={photosWaitingReview || '0'} icon={<Camera className="h-5 w-5" />} tone="neutral" />
        </div>

        <div id="priority-actions" className="mb-8 rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Priority Actions</h2>
              <p className="mt-1 text-sm text-slate-500">The items most likely to affect operations today.</p>
            </div>
            <Info className="h-5 w-5 text-slate-400" />
          </div>
          {priorityActions.length > 0 ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {priorityActions.map((action, index) => (
                <div key={`${action.title}-${index}`} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-2"><StatusBadge tone={action.tone}>{action.tone === 'critical' ? 'Urgent' : action.tone === 'overdue' ? 'Overdue' : 'Warning'}</StatusBadge></div>
                  <p className="text-sm font-semibold text-slate-950">{action.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{action.detail}</p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<CheckCircle2 className="h-6 w-6" />}
              title="No alerts right now"
              description="All pools are currently on track. New exceptions will appear here as guards submit tests."
            />
          )}
        </div>

        <div className="mb-8">
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Pool Card View</h2>
              <p className="mt-1 text-sm text-slate-500">Fast scan view for guard assignments and exceptions.</p>
            </div>
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
              <span className="rounded-md bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white">Card View</span>
              <span className="px-3 py-1.5 text-xs font-semibold text-slate-500">Table View</span>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {poolsWithStatus.map((pool) => (
              <div key={pool.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-slate-950">{pool.name}</h3>
                    <p className="mt-1 text-sm text-slate-500">{pool.pool_type || 'General pool'}</p>
                  </div>
                  <StatusBadge tone={getStatusColor(pool.status)}>{getStatusText(pool.status)}</StatusBadge>
                </div>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-slate-50 p-3">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Last Test</dt>
                    <dd className="mt-1 font-semibold text-slate-900">{pool.latestLog ? formatDateTime(pool.latestLog.created_at) : 'Never'}</dd>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Next Due</dt>
                    <dd className="mt-1 font-semibold text-slate-900">{formatRelativeDue(pool.latestLog)}</dd>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Free Chlorine</dt>
                    <dd className="mt-1 font-mono font-semibold text-slate-900">{pool.latestLog ? `${pool.latestLog.free_chlorine.toFixed(1)} ppm` : 'No data'}</dd>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">pH</dt>
                    <dd className="mt-1 font-mono font-semibold text-slate-900">{pool.latestLog ? pool.latestLog.ph.toFixed(1) : 'No data'}</dd>
                  </div>
                </dl>
                <div className="mt-4 flex gap-2">
                  <Link href={`/log?poolId=${pool.id}`} className={buttonClass.primary}>Log Test</Link>
                  <Link href={`/management/pools/${pool.id}`} className={buttonClass.secondary}>
                    <Eye className="mr-2 h-4 w-4" />
                    View History
                  </Link>
                </div>
              </div>
            ))}
          </div>
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

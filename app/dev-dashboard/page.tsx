import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { Activity, AlertTriangle, Bug, ClipboardList, Database, Server, Users, Waves } from 'lucide-react';
import { getServerAppSession } from '@/lib/serverAppSession';
import { createAdminClient } from '@/lib/supabase/admin';
import { isUuid } from '@/lib/devCompanyScope';
import { StatCard, StatusBadge } from '@/components/OperationsUI';
import DevBranchingPanel from '@/components/dev/DevBranchingPanel';
import DevShell from '@/components/dev/DevShell';
import DevToolPanel from '@/components/dev/DevToolPanel';
import SpotifyPlayer from '@/components/dev/SpotifyPlayer';
import {
  defaultFeatureFlags,
  getAdminOrError,
  readDevApiRequests,
  readDevCompanies,
  readDevRawLogs,
  readDevTables,
  readFeatureFlags,
  resolveDevCompanyId,
  type DevApiRequest,
  type DevFeatureFlag,
  type DevRawLog,
  type DevTableSummary,
} from '@/lib/devTools';

export const dynamic = 'force-dynamic';

type RecentLog = {
  id: string;
  free_chlorine?: number | null;
  ph?: number | null;
  created_at?: string | null;
  pools?: { name?: string | null } | null;
};

type DevSnapshot = {
  activeUsers: number;
  pools: number;
  recentLogs: RecentLog[];
  alerts: number;
  errors: string[];
  apiHealth: 'healthy' | 'degraded';
  databaseStatus: 'connected' | 'unavailable';
  tables: DevTableSummary[];
  flags: DevFeatureFlag[];
  rawLogs: DevRawLog[];
  apiRequests: DevApiRequest[];
};

const emptySnapshot: DevSnapshot = {
  activeUsers: 0,
  pools: 0,
  recentLogs: [],
  alerts: 0,
  errors: [],
  apiHealth: 'degraded',
  databaseStatus: 'unavailable',
  tables: [],
  flags: defaultFeatureFlags,
  rawLogs: [],
  apiRequests: [],
};

const formatLogTime = (value?: string | null) => {
  if (!value) return 'No timestamp';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' });
};

async function loadSnapshot(selectedCompanyId?: string): Promise<DevSnapshot> {
  try {
    const supabase = createAdminClient();
    const scopedPoolsQuery = supabase.from('pools').select('id', { count: 'exact' });
    if (selectedCompanyId) scopedPoolsQuery.eq('company_id', selectedCompanyId);
    const poolsForScope = await scopedPoolsQuery;
    const poolIds = (poolsForScope.data ?? []).map((pool) => pool.id);

    const logsQuery = supabase
      .from('chemical_logs')
      .select('id, free_chlorine, ph, created_at, pools(name)')
      .order('created_at', { ascending: false })
      .limit(10);
    if (selectedCompanyId) {
      if (poolIds.length === 0) {
        logsQuery.eq('pool_id', '__no_pools_for_company__');
      } else {
        logsQuery.in('pool_id', poolIds);
      }
    }

    const alertsQuery = supabase.from('dev_alerts').select('id', { count: 'exact', head: true });
    if (selectedCompanyId) alertsQuery.contains('metadata', { company_id: selectedCompanyId });

    const errorLogsQuery = supabase
      .from('error_logs')
      .select('message,created_at')
      .order('created_at', { ascending: false })
      .limit(8);
    if (selectedCompanyId) errorLogsQuery.eq('company_id', selectedCompanyId);

    const usersQuery = supabase.from('users').select('id', { count: 'exact', head: true });
    if (selectedCompanyId) usersQuery.eq('company_id', selectedCompanyId);

    const [usersResult, logsResult, alertsResult, errorLogsResult, flags, rawLogs, apiRequests, tables] = await Promise.all([
      usersQuery,
      logsQuery,
      alertsQuery,
      errorLogsQuery,
      readFeatureFlags(),
      readDevRawLogs(),
      readDevApiRequests(),
      readDevTables(),
    ]);

    const queryErrors = [usersResult.error, poolsForScope.error, logsResult.error, alertsResult.error]
      .filter(Boolean)
      .map((error) => error?.message ?? 'Unknown Supabase error');
    const errorLogMessages = errorLogsResult.error
      ? []
      : ((errorLogsResult.data ?? []) as Array<{ message?: string | null; created_at?: string | null }>)
          .map((row) => row.message || row.created_at || 'error_log row')
          .filter(Boolean);

    return {
      activeUsers: usersResult.count ?? 0,
      pools: poolsForScope.count ?? 0,
      recentLogs: (logsResult.data ?? []) as RecentLog[],
      alerts: alertsResult.count ?? 0,
      errors: [...queryErrors, ...errorLogMessages],
      apiHealth: queryErrors.length > 0 ? 'degraded' : 'healthy',
      databaseStatus: queryErrors.length > 1 ? 'unavailable' : 'connected',
      tables,
      flags,
      rawLogs,
      apiRequests,
    };
  } catch (error) {
    return {
      ...emptySnapshot,
      errors: [(error as Error).message],
    };
  }
}

export default async function DevDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ companyId?: string }>;
}) {
  const session = await getServerAppSession();

  if (session?.role !== 'dev') {
    redirect('/dashboard');
  }

  const params = await searchParams;
  const rawCompanyId = params?.companyId?.trim() ?? '';
  const { supabase } = getAdminOrError();

  let selectedCompanyId = '';
  if (rawCompanyId) {
    if (supabase) {
      selectedCompanyId = (await resolveDevCompanyId(supabase, rawCompanyId)) ?? '';
    } else if (isUuid(rawCompanyId)) {
      selectedCompanyId = rawCompanyId;
    }
  }

  if (rawCompanyId && selectedCompanyId && rawCompanyId !== selectedCompanyId) {
    redirect(`/dev-dashboard?companyId=${encodeURIComponent(selectedCompanyId)}`);
  }

  if (rawCompanyId && !selectedCompanyId) {
    redirect('/dev-dashboard');
  }

  const [snapshot, companies] = await Promise.all([
    loadSnapshot(selectedCompanyId),
    readDevCompanies(),
  ]);

  const selectedCompany = selectedCompanyId
    ? companies.find((company) => company.id === selectedCompanyId) ?? null
    : null;

  return (
    <DevShell>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Developer Access</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">System Overlay</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              System-wide status for ChemDeck accounts, pool operations, chemistry logging, API routes, and database connectivity.
            </p>
            {selectedCompany ? (
              <p className="mt-3 inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-800">
                Scoped to {selectedCompany.company_name} ({selectedCompany.company_code})
              </p>
            ) : (
              <p className="mt-3 text-sm font-semibold text-amber-700">Select a company below to scope tools and POV previews.</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Suspense fallback={<div className="h-10 w-24 rounded-md bg-slate-100" />}>
              <SpotifyPlayer />
            </Suspense>
            <StatusBadge tone={snapshot.apiHealth === 'healthy' ? 'good' : 'warning'}>
              API {snapshot.apiHealth}
            </StatusBadge>
          </div>
        </div>

        <DevBranchingPanel companies={companies} initialCompanyId={selectedCompanyId} />

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Active users" value={snapshot.activeUsers} icon={<Users className="h-5 w-5" />} tone="info" />
          <StatCard label="Pools" value={snapshot.pools} icon={<Waves className="h-5 w-5" />} tone="good" />
          <StatCard label="Recent chem logs" value={snapshot.recentLogs.length} icon={<ClipboardList className="h-5 w-5" />} tone="neutral" />
          <StatCard label="Alerts" value={snapshot.alerts} icon={<AlertTriangle className="h-5 w-5" />} tone={snapshot.alerts ? 'warning' : 'good'} />
          <StatCard label="Errors" value={snapshot.errors.length} icon={<Bug className="h-5 w-5" />} tone={snapshot.errors.length ? 'critical' : 'good'} />
          <StatCard label="API health" value={snapshot.apiHealth} icon={<Server className="h-5 w-5" />} tone={snapshot.apiHealth === 'healthy' ? 'good' : 'warning'} />
          <StatCard label="Database" value={snapshot.databaseStatus} icon={<Database className="h-5 w-5" />} tone={snapshot.databaseStatus === 'connected' ? 'good' : 'critical'} />
          <StatCard label="Session" value="dev" icon={<Activity className="h-5 w-5" />} tone="info" />
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Recent Chem Logs</h2>
            <div className="mt-4 divide-y divide-slate-200 rounded-md border border-slate-200">
              {snapshot.recentLogs.length === 0 ? (
                <p className="px-3 py-6 text-sm text-slate-500">No recent chemistry logs found.</p>
              ) : (
                snapshot.recentLogs.map((log) => (
                  <div key={log.id} className="grid gap-2 px-3 py-3 text-sm sm:grid-cols-[1fr_96px_80px_132px]">
                    <span className="font-semibold text-slate-900">{log.pools?.name ?? 'Unassigned pool'}</span>
                    <span className="text-slate-600">FC {log.free_chlorine ?? '-'}</span>
                    <span className="text-slate-600">pH {log.ph ?? '-'}</span>
                    <span className="text-slate-500">{formatLogTime(log.created_at)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Errors</h2>
            <div className="mt-4 space-y-2">
              {snapshot.errors.length === 0 ? (
                <p className="rounded-md border border-green-200 bg-green-50 px-3 py-3 text-sm font-semibold text-green-700">No backend errors detected.</p>
              ) : (
                snapshot.errors.map((error) => (
                  <p key={error} className="rounded-md border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-800">{error}</p>
                ))
              )}
            </div>
          </div>
        </section>

        <div className="mt-6">
          <DevToolPanel
            tables={snapshot.tables}
            initialFlags={snapshot.flags}
            initialLogs={snapshot.rawLogs}
            initialRequests={snapshot.apiRequests}
            selectedCompanyId={selectedCompanyId}
          />
        </div>
      </div>
    </DevShell>
  );
}

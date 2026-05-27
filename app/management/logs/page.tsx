import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import LogDateSlider from '../../../components/LogDateSlider';
import ManagementLogFilters from '../../../components/ManagementLogFilters';
import { getServerAppSession } from '../../../lib/serverAppSession';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveCompanyScopeId } from '@/lib/resolveCompanyScopeId';
import { temporaryLoginBypass } from '../../../lib/temporaryLoginBypass';
import {
  DEFAULT_OPERATING_TIME_ZONE,
  formatOperatingTime,
  getOperatingDayBounds,
  getOperatingHour,
  getOperatingHourLabel,
  getOperatingHourSlots,
  toOperatingDateInputValue,
} from '@/lib/operatingDayBounds';
import { getUnionHourSlotsForDate, type PoolScheduleEvent } from '@/lib/poolSchedule';
import { EmptyState, PageHeader, SectionCard, StatCard, StatusBadge, buttonClass, type StatusTone } from '../../../components/OperationsUI';
import { ClipboardList, Clock3, Filter, FileSpreadsheet, Rows3, Waves } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface ChemicalLogRow {
  id: string;
  pool_id: string;
  submitted_by?: string | null;
  free_chlorine?: number | null;
  ph?: number | null;
  dosing_amount?: number | null;
  dosing_unit?: string | null;
  dosing_chemical?: string | null;
  dosing_recommendation?: string | null;
  notes?: string | null;
  photo_url?: string | null;
  created_at: string;
}

interface ProfileSummary {
  id: string;
  full_name?: string | null;
  email?: string | null;
}


const getSelectedDate = (value?: string) => {
  if (!value || Number.isNaN(new Date(`${value}T00:00:00`).getTime())) {
    return toOperatingDateInputValue();
  }
  return value;
};

const getLogTime = (log: ChemicalLogRow) => new Date(log.created_at);

const getLogStatus = (log: ChemicalLogRow) => {
  const chlorine = log.free_chlorine;
  const ph = log.ph;

  if (typeof chlorine !== 'number' || typeof ph !== 'number') {
    return { label: 'Legacy', tone: 'neutral' as StatusTone };
  }

  if (chlorine < 1 || chlorine > 4 || ph < 7.2 || ph > 7.8) {
    return { label: 'Review', tone: 'critical' as StatusTone };
  }

  return { label: 'In Range', tone: 'good' as StatusTone };
};

const formatTime = (date: Date) => formatOperatingTime(date);

const getLogStatusKey = (log: ChemicalLogRow) => {
  const status = getLogStatus(log);
  if (status.label === 'In Range') return 'in-range';
  if (status.label === 'Review') return 'review';
  return 'legacy';
};

export default async function ManagementLogsPage({ searchParams }: { searchParams: Promise<{ date?: string; q?: string; status?: string; logger?: string; photo?: string; companyId?: string }> }) {
  const params = await searchParams;
  const selectedDate = getSelectedDate(params?.date);
  const { start: dayStart, end: dayEnd } = getOperatingDayBounds(selectedDate, DEFAULT_OPERATING_TIME_ZONE);

  const appSession = await getServerAppSession();
  const isDevPreview = appSession?.role === 'dev';
  const resolvedDevCompanyId = isDevPreview ? await resolveCompanyScopeId(params?.companyId) : undefined;

  if (!temporaryLoginBypass && !isDevPreview && appSession?.role !== 'manager') {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      redirect('/login');
    }
  }

  if (isDevPreview && !resolvedDevCompanyId) {
    redirect('/dev-dashboard');
  }

  const supabase = resolvedDevCompanyId ? createAdminClient() : await createClient();
  let companyId: string | null = resolvedDevCompanyId ?? null;

  if (!companyId) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('company_id, role')
        .eq('id', session.user.id)
        .single();

      companyId = profileData?.company_id || null;

      if (!companyId) {
        redirect('/choose-role');
      }

      if (!['boss', 'manager', 'supervisor', 'admin'].includes(profileData?.role ?? '')) {
        redirect('/guard');
      }
    }
  }

  const companyQuery = companyId ? `?companyId=${encodeURIComponent(companyId)}` : '';

  let poolsQuery = supabase
    .from('pools')
    .select('id,name,operating_schedule')
    .order('name');

  if (companyId) {
    poolsQuery = poolsQuery.eq('company_id', companyId);
  }

  const { data: pools } = await poolsQuery;

  const poolMap = new Map(pools?.map((pool) => [pool.id, pool.name]) || []);

  const poolIds = Array.from(poolMap.keys());

  const { data: scheduleEvents } = poolIds.length > 0
    ? await supabase
      .from('pool_schedule_events')
      .select('id, pool_id, company_id, event_date, event_type, title, closed, open_time, close_time, notes')
      .in('pool_id', poolIds)
      .eq('event_date', selectedDate)
    : { data: [] };

  const dayEvents: PoolScheduleEvent[] = (scheduleEvents ?? []).map((row) => ({
    id: String(row.id),
    pool_id: String(row.pool_id),
    company_id: String(row.company_id),
    event_date: String(row.event_date).slice(0, 10),
    event_type: String(row.event_type ?? 'custom').toLowerCase() as PoolScheduleEvent['event_type'],
    title: String(row.title ?? ''),
    closed: Boolean(row.closed),
    open: row.open_time ? String(row.open_time).slice(0, 5) : null,
    close: row.close_time ? String(row.close_time).slice(0, 5) : null,
    notes: row.notes ? String(row.notes) : null,
  }));

  const { data: logs, error } = poolIds.length > 0
    ? await supabase
      .from('chemical_logs')
      .select('id,pool_id,submitted_by,free_chlorine,ph,dosing_amount,dosing_unit,dosing_chemical,dosing_recommendation,notes,photo_url,created_at')
      .in('pool_id', poolIds)
      .gte('created_at', dayStart.toISOString())
      .lt('created_at', dayEnd.toISOString())
      .order('created_at', { ascending: false })
    : { data: [], error: null };

  if (error && !temporaryLoginBypass) {
    throw new Error(`Unable to fetch logs: ${error.message}`);
  }

  const dayLogs = (error ? [] : logs ?? []) as ChemicalLogRow[];
  const q = params?.q?.trim().toLowerCase() ?? '';
  const statusFilter = params?.status?.trim() ?? '';
  const loggerFilter = params?.logger?.trim() ?? '';
  const photoFilter = params?.photo?.trim() ?? '';

  const filteredLogs = dayLogs.filter((log) => {
    const poolName = poolMap.get(log.pool_id) || '';
    if (q && !poolName.toLowerCase().includes(q)) return false;
    if (loggerFilter && log.submitted_by !== loggerFilter) return false;
    const statusKey = getLogStatusKey(log);
    if (statusFilter && statusKey !== statusFilter) return false;
    if (photoFilter === 'missing-photo' && log.photo_url) return false;
    return true;
  });

  const submitterIds = Array.from(new Set(dayLogs.map((log) => log.submitted_by).filter(Boolean))) as string[];
  const { data: submitters } = submitterIds.length > 0
    ? await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', submitterIds)
    : { data: [] };
  const submitterMap = new Map(
    ((submitters ?? []) as ProfileSummary[]).map((profile) => [
      profile.id,
      profile.full_name || profile.email || profile.id,
    ])
  );
  const hours = getUnionHourSlotsForDate(pools ?? [], dayEvents, selectedDate, getOperatingHourSlots());

  return (
    <div className="space-y-5">
        <PageHeader
          eyebrow="Management"
          title="Daily Log Sheet"
          description="Audit pool chemistry submissions by date, time slot, status, and staff member."
          icon={<ClipboardList className="h-4 w-4" />}
          actions={(
            <>
              <Link href={`/management/compliance${companyQuery}`} className={buttonClass.secondary}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Compliance report
              </Link>
              <Link href={`/management/team${companyQuery}`} className={buttonClass.secondary}>
                Team invites
              </Link>
            </>
          )}
        />
        {temporaryLoginBypass && error ? (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
            Login bypass is active, so live Supabase log data may be hidden until the auth work is finished.
          </div>
        ) : null}

        <Suspense fallback={<div className="h-24 rounded-xl bg-slate-100" />}>
          <LogDateSlider selectedDate={selectedDate} />
        </Suspense>

        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label="Rows" value={filteredLogs.length} icon={<Rows3 className="h-5 w-5" />} tone="info" />
          <StatCard label="Pools" value={poolMap.size} icon={<Waves className="h-5 w-5" />} tone="neutral" />
          <StatCard label="Slots" value={hours.length} icon={<Clock3 className="h-5 w-5" />} tone="neutral" />
        </div>

        <SectionCard className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-950">Search and Filters</h2>
          </div>
          {/* Filters persist in URL search params and apply to CSV export. */}
          <Suspense fallback={<div className="h-10 rounded-lg bg-slate-100" />}>
            <ManagementLogFilters
              selectedDate={selectedDate}
              submitterOptions={submitterIds.map((id) => ({
                id,
                label: submitterMap.get(id) || 'Unknown',
              }))}
            />
          </Suspense>
        </SectionCard>

        <SectionCard className="overflow-hidden">
          <div className="border-b border-slate-200 bg-white px-5 py-4">
            <h2 className="text-base font-semibold text-slate-950">Log Rows</h2>
            <p className="mt-1 text-sm text-slate-500">Chemistry submissions grouped by operating hour.</p>
          </div>
          {filteredLogs.length === 0 ? (
            <div className="p-5">
              <EmptyState
                icon={<ClipboardList className="h-6 w-6" />}
                title="No chemical logs recorded for this day yet."
                description="Use the date controls above to review another day, or submit a new chemical log from the Submit Log workflow."
              />
            </div>
          ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0">
              <thead className="bg-slate-50">
                <tr>
                  <th className="sticky left-0 z-10 border-b border-slate-200 bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Hour</th>
                  <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Pool</th>
                  <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Logged</th>
                  <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Free Chlorine</th>
                  <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">pH</th>
                  <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Dose / Chemical</th>
                  <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                  <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Notes</th>
                  <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Logger</th>
                </tr>
              </thead>
              <tbody>
                {hours.map((hour) => {
                  const slotLogs = filteredLogs.filter((log) => getOperatingHour(log.created_at) === hour);
                  const rows = slotLogs.length > 0 ? slotLogs : [null];

                  return rows.map((log, index) => {
                    const status = log ? getLogStatus(log) : null;

                    return (
                      <tr key={`${hour}-${log?.id || 'empty'}-${index}`} className="hover:bg-slate-50">
                        {index === 0 ? (
                          <td rowSpan={rows.length} className="sticky left-0 z-10 border-b border-slate-200 bg-white px-4 py-3 align-top text-sm font-bold text-slate-900">
                            {getOperatingHourLabel(hour)}
                          </td>
                        ) : null}
                        <td className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900">{log ? poolMap.get(log.pool_id) || log.pool_id : <span className="text-slate-400">No entry</span>}</td>
                        <td className="border-b border-slate-200 px-4 py-3 text-sm text-slate-600">{log ? formatTime(getLogTime(log)) : <span className="text-slate-400">Not recorded</span>}</td>
                        <td className="border-b border-slate-200 px-4 py-3 text-sm text-slate-900">{typeof log?.free_chlorine === 'number' ? `${log.free_chlorine.toFixed(1)} ppm` : <span className="text-slate-400">—</span>}</td>
                        <td className="border-b border-slate-200 px-4 py-3 text-sm text-slate-900">{typeof log?.ph === 'number' ? log.ph.toFixed(1) : <span className="text-slate-400">—</span>}</td>
                        <td className="border-b border-slate-200 px-4 py-3 text-sm text-slate-700">
                          {log?.dosing_recommendation
                            || (log?.dosing_chemical
                              ? `${log.dosing_chemical}${typeof log.dosing_amount === 'number' ? ` · ${log.dosing_amount} ${log.dosing_unit || ''}` : ''}`
                              : <span className="text-slate-400">—</span>)}
                        </td>
                        <td className="border-b border-slate-200 px-4 py-3 text-sm">
                          {status ? <StatusBadge tone={status.tone}>{status.label}</StatusBadge> : <span className="text-slate-400">—</span>}
                        </td>
                        <td className="max-w-md border-b border-slate-200 px-4 py-3 text-sm text-slate-600">{log?.notes || <span className="text-slate-400">—</span>}</td>
                        <td className="border-b border-slate-200 px-4 py-3 text-xs text-slate-500">
                          {log?.submitted_by ? submitterMap.get(log.submitted_by) || 'Unknown' : 'Not recorded'}
                        </td>
                      </tr>
                    );
                  });
                })}
              </tbody>
            </table>
          </div>
          )}
        </SectionCard>
    </div>
  );
}

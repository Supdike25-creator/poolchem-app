import { redirect } from 'next/navigation';
import LogDateSlider from '../../../components/LogDateSlider';
import { getServerAppSession } from '../../../lib/serverAppSession';
import { createClient } from '@/utils/supabase/server';
import { temporaryLoginBypass } from '../../../lib/temporaryLoginBypass';
import { EmptyState, PageHeader, SectionCard, StatCard, StatusBadge, type StatusTone } from '../../../components/OperationsUI';
import { ClipboardList, Clock3, Rows3, Waves } from 'lucide-react';

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
  logged_at?: string | null;
  created_at: string;
}

interface ProfileSummary {
  id: string;
  full_name?: string | null;
  email?: string | null;
}

const toDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getSelectedDate = (value?: string) => {
  if (!value || Number.isNaN(new Date(`${value}T00:00:00`).getTime())) {
    return toDateInputValue(new Date());
  }
  return value;
};

const getHourLabel = (hour: number) => {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
};

const getLogTime = (log: ChemicalLogRow) => new Date(log.logged_at || log.created_at);

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

const formatTime = (date: Date) => date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

export default async function ManagementLogsPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const params = await searchParams;
  const selectedDate = getSelectedDate(params?.date);
  const dayStart = new Date(`${selectedDate}T00:00:00`);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const appSession = await getServerAppSession();

  if (!temporaryLoginBypass && !session?.user && appSession?.role !== 'manager') {
    redirect('/login');
  }

  let organizationId: string | null = null;
  if (session?.user) {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', session.user.id)
      .single();

    if (!profileData?.organization_id) {
      redirect('/onboarding/company');
    }

    if (!['manager', 'supervisor', 'admin'].includes(profileData.role)) {
      redirect('/guard');
    }

    organizationId = profileData.organization_id;
  }

  let poolsQuery = supabase
    .from('pools')
    .select('id,name')
    .order('name');

  if (organizationId) {
    poolsQuery = poolsQuery.eq('organization_id', organizationId);
  }

  const { data: pools } = await poolsQuery;

  const poolMap = new Map(pools?.map((pool) => [pool.id, pool.name]) || []);

  const poolIds = Array.from(poolMap.keys());
  const { data: logs, error } = poolIds.length > 0
    ? await supabase
      .from('chemical_logs')
      .select('id,pool_id,submitted_by,free_chlorine,ph,dosing_amount,dosing_unit,dosing_chemical,dosing_recommendation,notes,logged_at,created_at')
      .in('pool_id', poolIds)
      .gte('created_at', dayStart.toISOString())
      .lt('created_at', dayEnd.toISOString())
      .order('created_at', { ascending: false })
    : { data: [], error: null };

  if (error && !temporaryLoginBypass) {
    throw new Error(`Unable to fetch logs: ${error.message}`);
  }

  const dayLogs = (error ? [] : logs ?? []) as ChemicalLogRow[];
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
  const hours = Array.from({ length: 12 }, (_, index) => 9 + index);

  return (
    <div className="space-y-5">
        <PageHeader
          eyebrow="Management"
          title="Daily Log Sheet"
          description="Audit pool chemistry submissions by date, time slot, status, and staff member."
          icon={<ClipboardList className="h-4 w-4" />}
        />
        {temporaryLoginBypass && error ? (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
            Login bypass is active, so live Supabase log data may be hidden until the auth work is finished.
          </div>
        ) : null}

        <LogDateSlider selectedDate={selectedDate} />

        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label="Rows" value={dayLogs.length} icon={<Rows3 className="h-5 w-5" />} tone="info" />
          <StatCard label="Pools" value={poolMap.size} icon={<Waves className="h-5 w-5" />} tone="neutral" />
          <StatCard label="Slots" value="12" icon={<Clock3 className="h-5 w-5" />} tone="neutral" />
        </div>

        <SectionCard className="overflow-hidden">
          <div className="border-b border-slate-200 bg-white px-5 py-4">
            <h2 className="text-base font-semibold text-slate-950">Log Rows</h2>
            <p className="mt-1 text-sm text-slate-500">Chemistry submissions grouped by operating hour.</p>
          </div>
          {dayLogs.length === 0 ? (
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
                  const slotLogs = dayLogs.filter((log) => getLogTime(log).getHours() === hour);
                  const rows = slotLogs.length > 0 ? slotLogs : [null];

                  return rows.map((log, index) => {
                    const status = log ? getLogStatus(log) : null;

                    return (
                      <tr key={`${hour}-${log?.id || 'empty'}-${index}`} className="hover:bg-slate-50">
                        {index === 0 ? (
                          <td rowSpan={rows.length} className="sticky left-0 z-10 border-b border-slate-200 bg-white px-4 py-3 align-top text-sm font-bold text-slate-900">
                            {getHourLabel(hour)}
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

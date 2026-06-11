import { NextRequest, NextResponse } from 'next/server';
import { resolveApiCompanyScope } from '@/lib/apiCompanyScope';
import { mergePoolOperatingSchedule, type PoolOperatingSchedule } from '@/lib/poolSchedule';

export const dynamic = 'force-dynamic';

const managerRoles = new Set(['admin', 'manager', 'owner', 'boss', 'supervisor']);

const assertManagerAccess = (scope: { isDevPreview: boolean; account: { role?: string | null } | null }) => {
  if (scope.isDevPreview) return null;
  const role = String(scope.account?.role ?? '').toLowerCase();
  if (!managerRoles.has(role)) {
    return NextResponse.json({ ok: false, message: 'Only managers can manage pool schedules.' }, { status: 403 });
  }
  return null;
};

const mapEventRow = (row: Record<string, unknown>) => ({
  id: String(row.id),
  pool_id: String(row.pool_id),
  company_id: String(row.company_id),
  event_date: String(row.event_date).slice(0, 10),
  event_type: String(row.event_type ?? 'custom').toLowerCase(),
  title: String(row.title ?? ''),
  closed: Boolean(row.closed),
  open: row.open_time ? String(row.open_time).slice(0, 5) : null,
  close: row.close_time ? String(row.close_time).slice(0, 5) : null,
  notes: row.notes ? String(row.notes) : null,
  created_at: row.created_at ? String(row.created_at) : undefined,
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await resolveApiCompanyScope(request);
  if (!context.ok) return context.response;

  const forbidden = assertManagerAccess(context.scope);
  if (forbidden) return forbidden;

  const month = request.nextUrl.searchParams.get('month')?.trim() ?? '';
  const monthMatch = /^(\d{4})-(\d{2})$/.exec(month);
  if (!monthMatch) {
    return NextResponse.json({ ok: false, message: 'month query param required (YYYY-MM).' }, { status: 400 });
  }

  const year = Number(monthMatch[1]);
  const monthNum = Number(monthMatch[2]);
  const startDate = `${month}-01`;
  const endDate = new Date(Date.UTC(year, monthNum, 0)).toISOString().slice(0, 10);

  const { companyId, accountDb } = context.scope;
  const { data: pool, error: poolError } = await accountDb
    .from('pools')
    .select('id, name, operating_schedule')
    .eq('id', id)
    .eq('company_id', companyId)
    .maybeSingle();

  if (poolError) {
    return NextResponse.json({ ok: false, message: poolError.message }, { status: 500 });
  }
  if (!pool) {
    return NextResponse.json({ ok: false, message: 'Pool not found.' }, { status: 404 });
  }

  const { data: events, error: eventsError } = await accountDb
    .from('pool_schedule_events')
    .select('id, pool_id, company_id, event_date, event_type, title, closed, open_time, close_time, notes, created_at')
    .eq('pool_id', id)
    .gte('event_date', startDate)
    .lte('event_date', endDate)
    .order('event_date', { ascending: true });

  if (eventsError) {
    const needsMigration = eventsError.message.toLowerCase().includes('pool_schedule_events')
      || eventsError.message.toLowerCase().includes('does not exist');
    return NextResponse.json(
      {
        ok: false,
        message: needsMigration
          ? 'Run SUPABASE_POOL_SCHEDULE.sql in Supabase to enable pool calendars.'
          : eventsError.message,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    pool: {
      id: pool.id,
      name: pool.name,
      operating_schedule: mergePoolOperatingSchedule(pool.operating_schedule),
    },
    events: (events ?? []).map((row) => mapEventRow(row as Record<string, unknown>)),
  });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await resolveApiCompanyScope(request);
  if (!context.ok) return context.response;

  const forbidden = assertManagerAccess(context.scope);
  if (forbidden) return forbidden;

  const body = await request.json().catch(() => null) as { operating_schedule?: PoolOperatingSchedule } | null;
  if (!body?.operating_schedule) {
    return NextResponse.json({ ok: false, message: 'operating_schedule is required.' }, { status: 400 });
  }

  const schedule = mergePoolOperatingSchedule(body.operating_schedule);
  const { companyId, accountDb } = context.scope;

  const { data, error } = await accountDb
    .from('pools')
    .update({ operating_schedule: schedule })
    .eq('id', id)
    .eq('company_id', companyId)
    .select('id, name, operating_schedule')
    .maybeSingle();

  if (error) {
    const needsMigration = error.message.toLowerCase().includes('operating_schedule');
    return NextResponse.json(
      {
        ok: false,
        message: needsMigration
          ? 'Run SUPABASE_POOL_SCHEDULE.sql in Supabase to enable pool hours.'
          : error.message,
      },
      { status: 500 },
    );
  }

  if (!data) {
    return NextResponse.json({ ok: false, message: 'Pool not found.' }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    pool: {
      ...data,
      operating_schedule: mergePoolOperatingSchedule(data.operating_schedule),
    },
  });
}

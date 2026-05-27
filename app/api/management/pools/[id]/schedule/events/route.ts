import { NextRequest, NextResponse } from 'next/server';
import { resolveApiCompanyScope } from '@/lib/apiCompanyScope';

export const dynamic = 'force-dynamic';

const managerRoles = new Set(['boss', 'manager', 'admin', 'supervisor', 'owner']);
const validTypes = new Set(['holiday', 'party', 'maintenance', 'extended', 'custom']);

const assertManagerAccess = (scope: { isDevPreview: boolean; account: { role?: string | null } | null }) => {
  if (scope.isDevPreview) return null;
  const role = String(scope.account?.role ?? '').toLowerCase();
  if (!managerRoles.has(role)) {
    return NextResponse.json({ ok: false, message: 'Only managers can manage pool schedules.' }, { status: 403 });
  }
  return null;
};

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: poolId } = await params;
  const context = await resolveApiCompanyScope(request);
  if (!context.ok) return context.response;

  const forbidden = assertManagerAccess(context.scope);
  if (forbidden) return forbidden;

  const body = await request.json().catch(() => null) as {
    event_date?: string;
    event_type?: string;
    title?: string;
    closed?: boolean;
    open?: string | null;
    close?: string | null;
    notes?: string | null;
  } | null;

  const eventDate = body?.event_date?.trim();
  const title = body?.title?.trim();
  const eventType = body?.event_type?.trim().toLowerCase() ?? 'custom';

  if (!eventDate || !/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) {
    return NextResponse.json({ ok: false, message: 'Valid event_date (YYYY-MM-DD) is required.' }, { status: 400 });
  }
  if (!title) {
    return NextResponse.json({ ok: false, message: 'Event title is required.' }, { status: 400 });
  }
  if (!validTypes.has(eventType)) {
    return NextResponse.json({ ok: false, message: 'Invalid event type.' }, { status: 400 });
  }

  const closed = Boolean(body?.closed);
  const open = closed ? null : body?.open?.trim() || null;
  const close = closed ? null : body?.close?.trim() || null;

  const { companyId, accountDb } = context.scope;
  const { data: pool } = await accountDb
    .from('pools')
    .select('id')
    .eq('id', poolId)
    .eq('company_id', companyId)
    .maybeSingle();

  if (!pool) {
    return NextResponse.json({ ok: false, message: 'Pool not found.' }, { status: 404 });
  }

  const { data, error } = await accountDb
    .from('pool_schedule_events')
    .upsert(
      {
        pool_id: poolId,
        company_id: companyId,
        event_date: eventDate,
        event_type: eventType,
        title,
        closed,
        open_time: open,
        close_time: close,
        notes: body?.notes?.trim() || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'pool_id,event_date' },
    )
    .select('id, pool_id, company_id, event_date, event_type, title, closed, open_time, close_time, notes, created_at')
    .single();

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    event: {
      id: data.id,
      pool_id: data.pool_id,
      company_id: data.company_id,
      event_date: String(data.event_date).slice(0, 10),
      event_type: data.event_type,
      title: data.title,
      closed: data.closed,
      open: data.open_time ? String(data.open_time).slice(0, 5) : null,
      close: data.close_time ? String(data.close_time).slice(0, 5) : null,
      notes: data.notes,
      created_at: data.created_at,
    },
  }, { status: 201 });
}

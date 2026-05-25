import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { loadCompanyAlerts } from '@/lib/alerts';

export const dynamic = 'force-dynamic';

const managerRoles = new Set(['boss', 'manager', 'admin', 'supervisor', 'owner']);

const getContext = async () => {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { error: NextResponse.json({ ok: false, message: 'Unauthorized.' }, { status: 401 }) };
  }

  const db = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : supabase;
  const { data: account } = await db
    .from('users')
    .select('role, company_id')
    .eq('id', user.id)
    .maybeSingle();

  const companyId = account?.company_id ?? null;
  if (!companyId) {
    return { error: NextResponse.json({ ok: false, message: 'Join a company before viewing alerts.' }, { status: 400 }) };
  }

  return { user, companyId, role: account?.role ?? '', db };
};

export async function GET(request: NextRequest) {
  const context = await getContext();
  if ('error' in context && context.error) return context.error;

  const { companyId, role, db } = context;
  const unreadOnly = request.nextUrl.searchParams.get('unread') === '1';
  const limit = Number(request.nextUrl.searchParams.get('limit') ?? '20');

  let alerts = await loadCompanyAlerts(db, companyId, Number.isFinite(limit) ? limit : 20);
  if (unreadOnly) {
    alerts = alerts.filter((alert) => !alert.read_at);
  }

  if (!managerRoles.has(String(role).toLowerCase())) {
    alerts = alerts.filter((alert) => alert.alert_type !== 'manager_only');
  }

  const poolIds = Array.from(new Set(alerts.map((alert) => alert.pool_id).filter(Boolean))) as string[];
  const { data: pools } = poolIds.length
    ? await db.from('pools').select('id, name').in('id', poolIds)
    : { data: [] };

  const poolMap = new Map((pools ?? []).map((pool) => [pool.id, pool.name]));

  return NextResponse.json({
    ok: true,
    alerts: alerts.map((alert) => ({
      ...alert,
      pool_name: alert.pool_id ? poolMap.get(alert.pool_id) ?? null : null,
    })),
  });
}

export async function PATCH(request: NextRequest) {
  const context = await getContext();
  if ('error' in context && context.error) return context.error;

  const { companyId, role, db } = context;
  if (!managerRoles.has(String(role).toLowerCase())) {
    return NextResponse.json({ ok: false, message: 'Manager access required.' }, { status: 403 });
  }

  const body = await request.json().catch(() => null) as {
    alert_id?: string;
    mark_all_read?: boolean;
  } | null;

  if (body?.mark_all_read) {
    const { error } = await db
      .from('alerts')
      .update({ read_at: new Date().toISOString() })
      .eq('company_id', companyId)
      .is('read_at', null);

    if (error) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: 'All alerts marked read.' });
  }

  const alertId = body?.alert_id?.trim();
  if (!alertId) {
    return NextResponse.json({ ok: false, message: 'Alert id is required.' }, { status: 400 });
  }

  const { error } = await db
    .from('alerts')
    .update({ read_at: new Date().toISOString() })
    .eq('id', alertId)
    .eq('company_id', companyId);

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

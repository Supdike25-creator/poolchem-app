import { NextRequest, NextResponse } from 'next/server';
import { loadCompanyAlerts } from '@/lib/alerts';
import { resolveManagerApiScope } from '@/lib/managerApiScope';
import { resolveApiCompanyScope } from '@/lib/apiCompanyScope';

export const dynamic = 'force-dynamic';

const managerRoles = new Set(['boss', 'manager', 'admin', 'supervisor', 'owner']);

export async function GET(request: NextRequest) {
  const managerContext = await resolveManagerApiScope(request);
  const context = managerContext.ok ? managerContext : await resolveApiCompanyScope(request);

  if (!context.ok) {
    return context.response;
  }

  const { companyId, accountDb, account } = context.scope;
  const role = String(account?.role ?? '').toLowerCase();
  const isManager = managerContext.ok || managerRoles.has(role);

  const unreadOnly = request.nextUrl.searchParams.get('unread') === '1';
  const limit = Number(request.nextUrl.searchParams.get('limit') ?? '20');

  let alerts = await loadCompanyAlerts(accountDb, companyId, Number.isFinite(limit) ? limit : 20);
  if (unreadOnly) {
    alerts = alerts.filter((alert) => !alert.read_at);
  }

  if (!isManager) {
    alerts = alerts.filter((alert) => alert.alert_type !== 'manager_only');
  }

  const poolIds = Array.from(new Set(alerts.map((alert) => alert.pool_id).filter(Boolean))) as string[];
  const { data: pools } = poolIds.length
    ? await accountDb.from('pools').select('id, name').in('id', poolIds)
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
  const context = await resolveManagerApiScope(request);
  if (!context.ok) return context.response;

  const { companyId, accountDb } = context.scope;
  const body = await request.json().catch(() => null) as {
    alert_id?: string;
    mark_all_read?: boolean;
    companyId?: string;
  } | null;

  if (body?.mark_all_read) {
    const { error } = await accountDb
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

  const { error } = await accountDb
    .from('alerts')
    .update({ read_at: new Date().toISOString() })
    .eq('id', alertId)
    .eq('company_id', companyId);

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

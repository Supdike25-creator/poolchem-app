import { NextRequest, NextResponse } from 'next/server';
import { resolveApiCompanyScope } from '@/lib/apiCompanyScope';

export const dynamic = 'force-dynamic';

const managerRoles = new Set(['boss', 'manager', 'admin', 'supervisor', 'owner']);

const assertManagerAccess = (scope: { isDevPreview: boolean; account: { role?: string | null } | null }) => {
  if (scope.isDevPreview) return null;
  const role = String(scope.account?.role ?? '').toLowerCase();
  if (!managerRoles.has(role)) {
    return NextResponse.json({ ok: false, message: 'Only managers can manage pool schedules.' }, { status: 403 });
  }
  return null;
};

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; eventId: string }> },
) {
  const { id: poolId, eventId } = await params;
  const context = await resolveApiCompanyScope(_request);
  if (!context.ok) return context.response;

  const forbidden = assertManagerAccess(context.scope);
  if (forbidden) return forbidden;

  const { companyId, accountDb } = context.scope;
  const { error } = await accountDb
    .from('pool_schedule_events')
    .delete()
    .eq('id', eventId)
    .eq('pool_id', poolId)
    .eq('company_id', companyId);

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

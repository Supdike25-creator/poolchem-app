import { NextRequest, NextResponse } from 'next/server';
import { resolveApiCompanyScope } from '@/lib/apiCompanyScope';

export const dynamic = 'force-dynamic';

const managerRoles = new Set(['admin', 'manager', 'owner', 'boss', 'supervisor']);

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await resolveApiCompanyScope(request);
  if (!context.ok) return context.response;

  if (!context.scope.isDevPreview) {
    const role = String(context.scope.account?.role ?? '').toLowerCase();
    if (!managerRoles.has(role)) {
      return NextResponse.json({ ok: false, message: 'Only managers can view pool history.' }, { status: 403 });
    }
  }

  const { companyId, accountDb } = context.scope;
  const { data: pool } = await accountDb
    .from('pools')
    .select('id, name')
    .eq('id', id)
    .eq('company_id', companyId)
    .maybeSingle();

  if (!pool) {
    return NextResponse.json({ ok: false, message: 'Pool not found.' }, { status: 404 });
  }

  const limit = Math.min(Number(request.nextUrl.searchParams.get('limit') ?? 8), 50);
  const { data: logs, error } = await accountDb
    .from('chemical_logs')
    .select('id, free_chlorine, ph, dosing_recommendation, created_at')
    .eq('pool_id', id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, pool, logs: logs ?? [] });
}

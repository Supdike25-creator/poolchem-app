import { NextRequest, NextResponse } from 'next/server';
import { resolveApiCompanyScope } from '@/lib/apiCompanyScope';

export const dynamic = 'force-dynamic';

const managerRoles = new Set(['boss', 'manager', 'admin', 'supervisor', 'owner']);

const assertManagerAccess = (scope: { isDevPreview: boolean; account: { role?: string | null } | null }) => {
  if (scope.isDevPreview) return null;

  const role = String(scope.account?.role ?? '').toLowerCase();
  if (!managerRoles.has(role)) {
    return NextResponse.json({ ok: false, message: 'Only managers can manage pools.' }, { status: 403 });
  }

  return null;
};

type PoolPayload = {
  name?: string;
  pool_type?: string;
  volume_gallons?: number | null;
  target_chlorine_min?: number | null;
  target_chlorine_max?: number | null;
  target_ph_min?: number | null;
  target_ph_max?: number | null;
  default_chlorine_strength?: number | null;
  notes?: string | null;
};

export async function POST(request: NextRequest) {
  const context = await resolveApiCompanyScope(request);
  if (!context.ok) return context.response;

  const forbidden = assertManagerAccess(context.scope);
  if (forbidden) return forbidden;

  const body = (await request.json().catch(() => null)) as PoolPayload | null;
  const name = body?.name?.trim();

  if (!name) {
    return NextResponse.json({ ok: false, message: 'Pool name is required.' }, { status: 400 });
  }

  const { companyId, accountDb } = context.scope;
  const { data, error } = await accountDb
    .from('pools')
    .insert({
      name,
      pool_type: body?.pool_type?.trim() || null,
      volume_gallons: body?.volume_gallons ?? null,
      target_chlorine_min: body?.target_chlorine_min ?? null,
      target_chlorine_max: body?.target_chlorine_max ?? null,
      target_ph_min: body?.target_ph_min ?? null,
      target_ph_max: body?.target_ph_max ?? null,
      default_chlorine_strength: body?.default_chlorine_strength ?? null,
      notes: body?.notes?.trim() || null,
      company_id: companyId,
    })
    .select('id, name')
    .single();

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, pool: data });
}

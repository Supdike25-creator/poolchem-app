import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isGuardRole } from '@/lib/guardPools';

export const dynamic = 'force-dynamic';

const managerRoles = new Set(['boss', 'manager', 'admin', 'supervisor', 'owner']);

const getManagerContext = async () => {
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
    .select('id, role, company_id')
    .eq('id', user.id)
    .maybeSingle();

  const companyId = account?.company_id ?? null;
  const role = String(account?.role ?? '').toLowerCase();

  if (!companyId || !managerRoles.has(role)) {
    return { error: NextResponse.json({ ok: false, message: 'Manager access required.' }, { status: 403 }) };
  }

  return { user, companyId, db };
};

export async function GET() {
  const context = await getManagerContext();
  if ('error' in context && context.error) return context.error;

  const { companyId, db } = context;

  const [{ data: members }, { data: pools }, { data: assignments }] = await Promise.all([
    db
      .from('users')
      .select('id, full_name, email, role, status')
      .eq('company_id', companyId)
      .order('full_name'),
    db.from('pools').select('id, name').eq('company_id', companyId).order('name'),
    db
      .from('guard_pool_assignments')
      .select('guard_id, pool_id')
      .eq('company_id', companyId),
  ]);

  const guards = (members ?? []).filter((member) => isGuardRole(member.role));
  const assignmentMap = new Map<string, string[]>();

  for (const row of assignments ?? []) {
    const current = assignmentMap.get(row.guard_id) ?? [];
    current.push(row.pool_id);
    assignmentMap.set(row.guard_id, current);
  }

  return NextResponse.json({
    ok: true,
    guards,
    pools: pools ?? [],
    assignments: Object.fromEntries(assignmentMap),
    pendingMembers: (members ?? []).filter((member) => String(member.status).toLowerCase() === 'pending'),
  });
}

export async function POST(request: NextRequest) {
  const context = await getManagerContext();
  if ('error' in context && context.error) return context.error;

  const { companyId, db } = context;
  const body = await request.json().catch(() => null) as {
    guard_id?: string;
    pool_ids?: string[];
  } | null;

  const guardId = body?.guard_id?.trim();
  const poolIds = Array.isArray(body?.pool_ids) ? body.pool_ids.filter(Boolean) : [];

  if (!guardId) {
    return NextResponse.json({ ok: false, message: 'Select a guard.' }, { status: 400 });
  }

  const { data: guard } = await db
    .from('users')
    .select('id, company_id, role')
    .eq('id', guardId)
    .maybeSingle();

  if (!guard || guard.company_id !== companyId || !isGuardRole(guard.role)) {
    return NextResponse.json({ ok: false, message: 'Guard not found in your company.' }, { status: 404 });
  }

  await db.from('guard_pool_assignments').delete().eq('company_id', companyId).eq('guard_id', guardId);

  if (poolIds.length) {
    const { data: validPools } = await db
      .from('pools')
      .select('id')
      .eq('company_id', companyId)
      .in('id', poolIds);

    const validIds = (validPools ?? []).map((pool) => pool.id);
    if (validIds.length) {
      const { error: insertError } = await db.from('guard_pool_assignments').insert(
        validIds.map((poolId) => ({
          company_id: companyId,
          guard_id: guardId,
          pool_id: poolId,
        })),
      );

      if (insertError) {
        return NextResponse.json({ ok: false, message: insertError.message }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ ok: true, message: 'Pool assignments updated.', pool_ids: poolIds });
}

export async function PATCH(request: NextRequest) {
  const context = await getManagerContext();
  if ('error' in context && context.error) return context.error;

  const { companyId, db } = context;
  const body = await request.json().catch(() => null) as {
    user_id?: string;
    status?: string;
  } | null;

  const userId = body?.user_id?.trim();
  const status = body?.status?.trim().toLowerCase();

  if (!userId || !['active', 'pending', 'inactive'].includes(status ?? '')) {
    return NextResponse.json({ ok: false, message: 'Invalid approval request.' }, { status: 400 });
  }

  const { data: member } = await db
    .from('users')
    .select('id, company_id')
    .eq('id', userId)
    .maybeSingle();

  if (!member || member.company_id !== companyId) {
    return NextResponse.json({ ok: false, message: 'Team member not found.' }, { status: 404 });
  }

  const { error } = await db.from('users').update({ status }).eq('id', userId);
  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  await db.from('profiles').update({ status }).eq('id', userId);

  return NextResponse.json({ ok: true, message: `Member marked ${status}.` });
}

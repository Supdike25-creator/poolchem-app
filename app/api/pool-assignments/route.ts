import { NextRequest, NextResponse } from 'next/server';
import { isGuardRole } from '@/lib/guardPools';
import { resolveManagerApiScope } from '@/lib/managerApiScope';
import { loadCompanyTeamMembers, splitCompanyGuards } from '@/lib/teamMembers';
import { isPromotableTeamRole, workplaceRoleForPromotion } from '@/lib/teamRoles';
import { resolveDevUserRoles } from '@/lib/devRoleMapping';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const context = await resolveManagerApiScope(request);
  if (!context.ok) return context.response;

  const { companyId, accountDb } = context.scope;

  const [members, { data: pools }, { data: assignments }] = await Promise.all([
    loadCompanyTeamMembers(accountDb, companyId),
    accountDb.from('pools').select('id, name').eq('company_id', companyId).order('name'),
    accountDb
      .from('guard_pool_assignments')
      .select('guard_id, pool_id')
      .eq('company_id', companyId),
  ]);

  const { guards, pendingMembers } = splitCompanyGuards(members);
  const assignmentMap = new Map<string, string[]>();

  for (const row of assignments ?? []) {
    const current = assignmentMap.get(row.guard_id) ?? [];
    current.push(row.pool_id);
    assignmentMap.set(row.guard_id, current);
  }

  const roster = members
    .filter((member) => String(member.role ?? '').toLowerCase() !== 'dev')
    .sort((a, b) => (a.full_name || a.email || '').localeCompare(b.full_name || b.email || ''));

  return NextResponse.json({
    ok: true,
    guards: guards.sort((a, b) => (a.full_name || a.email || '').localeCompare(b.full_name || b.email || '')),
    members: roster,
    pools: pools ?? [],
    assignments: Object.fromEntries(assignmentMap),
    pendingMembers,
  });
}

export async function POST(request: NextRequest) {
  const context = await resolveManagerApiScope(request);
  if (!context.ok) return context.response;

  const { companyId, accountDb } = context.scope;
  const body = await request.json().catch(() => null) as {
    guard_id?: string;
    pool_ids?: string[];
    companyId?: string;
  } | null;

  const guardId = body?.guard_id?.trim();
  const poolIds = Array.isArray(body?.pool_ids) ? body.pool_ids.filter(Boolean) : [];

  if (!guardId) {
    return NextResponse.json({ ok: false, message: 'Select a guard.' }, { status: 400 });
  }

  const members = await loadCompanyTeamMembers(accountDb, companyId);
  const guard = members.find((member) => member.id === guardId && isGuardRole(member.role));

  if (!guard) {
    return NextResponse.json({ ok: false, message: 'Employee not found in your company.' }, { status: 404 });
  }

  await accountDb.from('guard_pool_assignments').delete().eq('company_id', companyId).eq('guard_id', guardId);

  if (poolIds.length) {
    const { data: validPools } = await accountDb
      .from('pools')
      .select('id')
      .eq('company_id', companyId)
      .in('id', poolIds);

    const validIds = (validPools ?? []).map((pool) => pool.id);
    if (validIds.length) {
      const { error: insertError } = await accountDb.from('guard_pool_assignments').insert(
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
  const context = await resolveManagerApiScope(request);
  if (!context.ok) return context.response;

  const { companyId, accountDb, userId: actorId } = context.scope;
  const body = await request.json().catch(() => null) as {
    user_id?: string;
    status?: string;
    role?: string;
    companyId?: string;
  } | null;

  const userId = body?.user_id?.trim();
  const status = body?.status?.trim().toLowerCase();
  const role = body?.role?.trim().toLowerCase();

  if (!userId) {
    return NextResponse.json({ ok: false, message: 'Select a team member.' }, { status: 400 });
  }

  const members = await loadCompanyTeamMembers(accountDb, companyId);
  const member = members.find((row) => row.id === userId);

  if (!member) {
    return NextResponse.json({ ok: false, message: 'Team member not found.' }, { status: 404 });
  }

  if (role) {
    if (userId === actorId) {
      return NextResponse.json({ ok: false, message: 'You cannot change your own role.' }, { status: 400 });
    }

    if (!isPromotableTeamRole(role)) {
      return NextResponse.json({ ok: false, message: 'Invalid role.' }, { status: 400 });
    }

    const workplaceRole = workplaceRoleForPromotion(role);
    const { loginRole } = resolveDevUserRoles(role);

    const { error } = await accountDb.from('users').update({ role: workplaceRole }).eq('id', userId);
    if (error && !error.message.toLowerCase().includes('does not exist')) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }

    await accountDb.from('profiles').update({ role: workplaceRole }).eq('id', userId);

    if (member.email) {
      await accountDb.from('app_accounts').update({ role: loginRole }).eq('email', member.email);
    }

    return NextResponse.json({ ok: true, message: `Role updated to ${role}.` });
  }

  if (!status || !['active', 'pending', 'inactive'].includes(status)) {
    return NextResponse.json({ ok: false, message: 'Invalid update request.' }, { status: 400 });
  }

  const { error } = await accountDb.from('users').update({ status }).eq('id', userId);
  if (error && !error.message.toLowerCase().includes('does not exist')) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  const { error: profileError } = await accountDb.from('profiles').update({ status }).eq('id', userId);
  if (profileError && !profileError.message.toLowerCase().includes('does not exist')) {
    return NextResponse.json({ ok: false, message: profileError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message: `Member marked ${status}.` });
}

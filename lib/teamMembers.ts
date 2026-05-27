import type { SupabaseClient } from '@supabase/supabase-js';
import { isGuardRole } from '@/lib/guardPools';

export type TeamMember = {
  id: string;
  full_name?: string | null;
  email?: string | null;
  role?: string | null;
  status?: string | null;
};


const mergeMembers = (rows: TeamMember[]) => {
  const map = new Map<string, TeamMember>();

  for (const row of rows) {
    if (!row.id) continue;
    const existing = map.get(row.id);
    map.set(row.id, {
      id: row.id,
      full_name: row.full_name ?? existing?.full_name ?? null,
      email: row.email ?? existing?.email ?? null,
      role: row.role ?? existing?.role ?? null,
      status: row.status ?? existing?.status ?? null,
    });
  }

  return Array.from(map.values());
};

export async function loadCompanyTeamMembers(
  accountDb: SupabaseClient,
  companyId: string,
): Promise<TeamMember[]> {
  const selectFields = 'id, full_name, email, role, status';

  const [{ data: users }, { data: profiles }] = await Promise.all([
    accountDb.from('users').select(selectFields).eq('company_id', companyId),
    accountDb.from('profiles').select(selectFields).eq('company_id', companyId),
  ]);

  return mergeMembers([...(users ?? []), ...(profiles ?? [])]);
}

export const splitCompanyGuards = (members: TeamMember[]) => {
  const guards = members.filter((member) => isGuardRole(member.role));
  const pendingMembers = members.filter(
    (member) => String(member.status ?? '').toLowerCase() === 'pending' && isGuardRole(member.role),
  );

  return { guards, pendingMembers };
};

export const isValidUuid = (value?: string | null) =>
  Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));

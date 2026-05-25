import type { SupabaseClient } from '@supabase/supabase-js';

type PoolRow = {
  id: string;
  name: string;
  pool_type?: string | null;
  volume_gallons?: number | null;
  target_chlorine_min?: number | null;
  target_chlorine_max?: number | null;
  target_ph_min?: number | null;
  target_ph_max?: number | null;
  default_chlorine_strength?: number | null;
  is_baby_pool?: boolean | null;
};

const guardRoles = new Set(['guard', 'worker', 'lifeguard', 'technician']);

export const isGuardRole = (role?: string | null) =>
  guardRoles.has(String(role ?? '').toLowerCase());

export async function getAssignedPoolIds(
  db: SupabaseClient,
  guardId: string,
  companyId: string,
): Promise<string[] | null> {
  const { data, error } = await db
    .from('guard_pool_assignments')
    .select('pool_id')
    .eq('company_id', companyId)
    .eq('guard_id', guardId);

  if (error) {
    if (error.message.toLowerCase().includes('does not exist')) {
      return null;
    }
    throw new Error(error.message);
  }

  if (!data?.length) return null;
  return data.map((row) => row.pool_id);
}

export async function loadGuardPools(
  db: SupabaseClient,
  input: {
    companyId: string;
    guardId?: string | null;
    guardRole?: string | null;
    devPreview?: boolean;
    select?: string;
  },
): Promise<PoolRow[]> {
  const select = input.select ?? 'id,name,pool_type,volume_gallons';
  const { data: pools, error } = await db
    .from('pools')
    .select(select)
    .eq('company_id', input.companyId)
    .order('name');

  if (error) {
    throw new Error(error.message);
  }

  const allPools = (pools ?? []) as unknown as PoolRow[];
  if (input.devPreview || !input.guardId || !isGuardRole(input.guardRole)) {
    return allPools;
  }

  const assignedIds = await getAssignedPoolIds(db, input.guardId, input.companyId);
  if (!assignedIds) {
    return allPools;
  }

  const assignedSet = new Set(assignedIds);
  return allPools.filter((pool) => assignedSet.has(pool.id));
}

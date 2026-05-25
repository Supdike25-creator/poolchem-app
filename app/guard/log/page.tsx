import { Suspense } from 'react';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveCompanyScopeId } from '@/lib/resolveCompanyScopeId';
import GuardLogClient, { type GuardPool } from './GuardLogClient';

export const dynamic = 'force-dynamic';

const poolSelect =
  'id,name,pool_type,volume_gallons,target_chlorine_min,target_chlorine_max,target_ph_min,target_ph_max,default_chlorine_strength';

async function loadInitialPools(companyId?: string): Promise<GuardPool[]> {
  if (!companyId) return [];

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('pools')
      .select(poolSelect)
      .eq('company_id', companyId)
      .order('name');

    if (error) return [];
    return (data ?? []) as GuardPool[];
  } catch {
    return [];
  }
}

export default async function GuardLogPage({
  searchParams,
}: {
  searchParams: Promise<{ poolId?: string; companyId?: string }>;
}) {
  const params = await searchParams;
  const companyId = await resolveCompanyScopeId(params?.companyId);
  const initialPools = await loadInitialPools(companyId);

  return (
    <Suspense fallback={<div className="p-8 text-sm text-slate-600">Loading chemical log...</div>}>
      <GuardLogClient initialPools={initialPools} />
    </Suspense>
  );
}

import { createAdminClient } from '@/lib/supabase/admin';
import { resolveDevCompanyId } from '@/lib/devTools';

export type DevCompanySummary = {
  id: string;
  company_name: string;
  company_code: string;
  created_by: string | null;
  user_count: number;
  guard_count: number;
  manager_count: number;
  pool_count: number;
  log_count: number;
  announcement_count: number;
  alert_count: number;
};

const managerRoles = new Set(['admin', 'manager', 'owner', 'boss', 'supervisor']);
const guardRoles = new Set(['employee', 'guard', 'worker', 'lifeguard', 'technician']);

export const loadDevCompanySummary = async (rawCompanyId: string): Promise<DevCompanySummary | null> => {
  const supabase = createAdminClient();
  const companyId = await resolveDevCompanyId(supabase, rawCompanyId);
  if (!companyId) return null;

  const { data: company, error } = await supabase
    .from('companies')
    .select('id, company_name, company_code, created_by')
    .eq('id', companyId)
    .maybeSingle();

  if (error || !company) return null;

  const [
    { data: users },
    { data: pools },
    { count: announcementCount },
    { count: alertCount },
  ] = await Promise.all([
    supabase.from('users').select('id, role').eq('company_id', companyId),
    supabase.from('pools').select('id').eq('company_id', companyId),
    supabase.from('announcements').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
    supabase.from('alerts').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
  ]);

  const poolIds = (pools ?? []).map((pool) => pool.id);
  let logCount = 0;
  if (poolIds.length > 0) {
    const { count } = await supabase
      .from('chemical_logs')
      .select('id', { count: 'exact', head: true })
      .in('pool_id', poolIds);
    logCount = count ?? 0;
  }

  const roleOf = (role?: string | null) => String(role ?? '').toLowerCase();
  const userRows = users ?? [];

  return {
    id: company.id,
    company_name: company.company_name,
    company_code: company.company_code,
    created_by: company.created_by,
    user_count: userRows.length,
    guard_count: userRows.filter((user) => guardRoles.has(roleOf(user.role))).length,
    manager_count: userRows.filter((user) => managerRoles.has(roleOf(user.role))).length,
    pool_count: poolIds.length,
    log_count: logCount,
    announcement_count: announcementCount ?? 0,
    alert_count: alertCount ?? 0,
  };
};

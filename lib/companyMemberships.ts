import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizeProfileRole, routeForRole } from '@/lib/auth/accountAccess';

export type CompanyMembership = {
  company_id: string;
  company_name: string;
  role: string;
  is_active: boolean;
};

export async function listUserCompanyMemberships(
  db: SupabaseClient,
  userId: string,
  activeCompanyId?: string | null,
): Promise<CompanyMembership[]> {
  const { data, error } = await db
    .from('user_company_memberships')
    .select('company_id, role, companies ( company_name )')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    if (error.message.toLowerCase().includes('user_company_memberships')) {
      if (!activeCompanyId) return [];
      const { data: company } = await db
        .from('companies')
        .select('company_name')
        .eq('id', activeCompanyId)
        .maybeSingle();
      return company
        ? [{ company_id: activeCompanyId, company_name: company.company_name, role: 'guard', is_active: true }]
        : [];
    }
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    company_id: row.company_id,
    company_name: (row.companies as { company_name?: string } | null)?.company_name || 'Company',
    role: String(row.role ?? 'guard'),
    is_active: row.company_id === activeCompanyId,
  }));
}

export async function upsertCompanyMembership(
  db: SupabaseClient,
  params: { userId: string; companyId: string; role?: string },
) {
  const role = params.role ?? 'guard';
  const { error } = await db.from('user_company_memberships').upsert(
    {
      user_id: params.userId,
      company_id: params.companyId,
      role,
    },
    { onConflict: 'user_id,company_id' },
  );

  if (error && !error.message.toLowerCase().includes('user_company_memberships')) {
    throw new Error(error.message);
  }
}

export async function setActiveCompany(
  db: SupabaseClient,
  userId: string,
  companyId: string,
) {
  const { data: membership } = await db
    .from('user_company_memberships')
    .select('company_id, role')
    .eq('user_id', userId)
    .eq('company_id', companyId)
    .maybeSingle();

  if (!membership) {
    return { ok: false as const, message: 'You are not a member of that company.' };
  }

  const role = String(membership.role ?? 'guard');
  const payload = {
    company_id: companyId,
    role,
    status: 'active',
    active: true,
  };

  await db.from('users').update(payload).eq('id', userId);
  await db.from('profiles').update(payload).eq('id', userId);

  return {
    ok: true as const,
    message: 'Company switched.',
    redirectTo: routeForRole(normalizeProfileRole(role)),
  };
}

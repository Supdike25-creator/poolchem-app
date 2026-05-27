import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { getServerAppSession } from '@/lib/serverAppSession';

export type AdminProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  username: string | null;
  passcode: string | null;
  role: string | null;
  company_id: string | null;
  active: boolean | null;
  status: string | null;
  last_login: string | null;
};

export type AdminCompany = {
  id: string;
  company_name: string;
  company_code: string;
  created_by: string | null;
  user_count: number;
  pool_count: number;
};

export type AdminPool = {
  id: string;
  name: string;
  company_id: string | null;
  company_name: string | null;
  location: string | null;
  pool_type: string | null;
};

export type AdminPoolDetail = {
  id: string;
  name: string;
  company_id: string | null;
  company_name: string | null;
  pool_type: string | null;
  volume_gallons: number | null;
  target_chlorine_min: number | null;
  target_chlorine_max: number | null;
  target_ph_min: number | null;
  target_ph_max: number | null;
  default_chlorine_strength: number | null;
  notes: string | null;
};

export const requireDev = async () => {
  const session = await getServerAppSession();
  if (session?.role !== 'dev') {
    redirect('/dashboard');
  }
};

export const loadCompanies = async (): Promise<AdminCompany[]> => {
  const supabase = createAdminClient();
  const [{ data: companies }, { data: users }, { data: pools }] = await Promise.all([
    supabase.from('companies').select('id,company_name,company_code,created_by').order('company_name'),
    supabase.from('users').select('id,company_id'),
    supabase.from('pools').select('id,company_id'),
  ]);

  return (companies ?? []).map((company) => ({
    id: company.id,
    company_name: company.company_name,
    company_code: company.company_code,
    created_by: company.created_by,
    user_count: (users ?? []).filter((user) => user.company_id === company.id).length,
    pool_count: (pools ?? []).filter((pool) => pool.company_id === company.id).length,
  }));
};

export const loadProfiles = async (): Promise<AdminProfile[]> => {
  const supabase = createAdminClient();
  const [{ data: users }, { data: appAccounts }, authUsers] = await Promise.all([
    supabase.from('users').select('id,email,full_name,role,company_id,active,status').order('email'),
    supabase.from('app_accounts').select('username,email,name,passcode_plain'),
    supabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);

  const usernameByEmail = new Map(
    (appAccounts ?? [])
      .filter((account) => account.email)
      .map((account) => [String(account.email).toLowerCase(), account.username as string]),
  );

  const passcodeByEmail = new Map(
    (appAccounts ?? [])
      .filter((account) => account.email && account.passcode_plain)
      .map((account) => [String(account.email).toLowerCase(), String(account.passcode_plain)]),
  );

  const lastLoginById = new Map(
    (authUsers.data.users ?? []).map((user) => [user.id, user.last_sign_in_at ?? null]),
  );

  return (users ?? []).map((user) => ({
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    username: user.email ? usernameByEmail.get(String(user.email).toLowerCase()) ?? null : null,
    passcode: user.email ? passcodeByEmail.get(String(user.email).toLowerCase()) ?? null : null,
    role: user.role,
    company_id: user.company_id,
    active: user.active,
    status: user.status,
    last_login: lastLoginById.get(user.id) ?? null,
  }));
};

export const loadPools = async (): Promise<AdminPool[]> => {
  const supabase = createAdminClient();
  const [{ data: pools }, { data: companies }] = await Promise.all([
    supabase.from('pools').select('id,name,company_id,pool_type,notes').order('name'),
    supabase.from('companies').select('id,company_name'),
  ]);
  const companyById = new Map((companies ?? []).map((company) => [company.id, company.company_name]));

  return (pools ?? []).map((pool) => ({
    id: pool.id,
    name: pool.name,
    company_id: pool.company_id,
    company_name: pool.company_id ? companyById.get(pool.company_id) ?? null : null,
    location: pool.notes,
    pool_type: pool.pool_type,
  }));
};

export const loadPool = async (poolId: string): Promise<AdminPoolDetail | null> => {
  const supabase = createAdminClient();
  const { data: pool, error } = await supabase
    .from('pools')
    .select('id,name,company_id,pool_type,volume_gallons,target_chlorine_min,target_chlorine_max,target_ph_min,target_ph_max,default_chlorine_strength,notes')
    .eq('id', poolId)
    .maybeSingle();

  if (error || !pool) return null;

  let companyName: string | null = null;
  if (pool.company_id) {
    const { data: company } = await supabase
      .from('companies')
      .select('company_name')
      .eq('id', pool.company_id)
      .maybeSingle();
    companyName = company?.company_name ?? null;
  }

  return {
    id: pool.id,
    name: pool.name,
    company_id: pool.company_id,
    company_name: companyName,
    pool_type: pool.pool_type,
    volume_gallons: pool.volume_gallons,
    target_chlorine_min: pool.target_chlorine_min,
    target_chlorine_max: pool.target_chlorine_max,
    target_ph_min: pool.target_ph_min,
    target_ph_max: pool.target_ph_max,
    default_chlorine_strength: pool.default_chlorine_strength,
    notes: pool.notes,
  };
};

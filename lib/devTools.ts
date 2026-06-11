import { NextRequest, NextResponse } from 'next/server';
import { isDevRequest } from '@/lib/auth/devSession';
import { createAdminClient } from '@/lib/supabase/admin';
import { isUuid } from '@/lib/devCompanyScope';

export type DevFeatureFlag = {
  key: string;
  label: string;
  enabled: boolean;
};

export type DevApiRequest = {
  id?: string;
  method: string;
  path: string;
  status: number;
  created_at?: string;
};

export type DevRawLog = {
  id?: string;
  level: string;
  message: string;
  created_at?: string;
};

export type DevTableSummary = {
  name: string;
  count: number | null;
  status: 'ok' | 'missing' | 'error';
};

export type DevCompany = {
  id: string;
  company_name: string;
  company_code?: string | null;
};

export const defaultFeatureFlags: DevFeatureFlag[] = [
  { key: 'newLogFlow', label: 'New log flow', enabled: true },
  { key: 'managerAlerts', label: 'Manager alerts', enabled: true },
  { key: 'strictChemRanges', label: 'Strict chem ranges', enabled: false },
  { key: 'photoReview', label: 'Photo review', enabled: true },
];

export const devTableNames = [
  'companies',
  'profiles',
  'users',
  'app_accounts',
  'pools',
  'chemical_logs',
  'dev_feature_flags',
  'dev_alerts',
  'dev_api_requests',
  'dev_raw_logs',
  'alerts',
  'error_logs',
];

export const optionalDevTableNames = new Set(['error_logs']);

export const resolveDevCompanyId = async (
  supabase: ReturnType<typeof createAdminClient>,
  raw?: string | null,
): Promise<string | null> => {
  const value = raw?.trim();
  if (!value) return null;
  if (isUuid(value)) return value;

  const { data, error } = await supabase
    .from('companies')
    .select('id')
    .eq('company_code', value.toUpperCase())
    .maybeSingle();

  if (error || !data?.id) return null;
  return data.id;
};

const readRawDevCompanyId = async (request: NextRequest) => {
  const fromQuery = request.nextUrl.searchParams.get('companyId')?.trim();
  if (fromQuery) return fromQuery;

  if (request.method === 'GET') {
    return null;
  }

  try {
    const body = await request.clone().json() as {
      companyId?: string | null;
      selected_company_id?: string | null;
    } | null;

    return body?.companyId?.trim() || body?.selected_company_id?.trim() || null;
  } catch {
    return null;
  }
};

export const getAdminOrError = () => {
  try {
    return { supabase: createAdminClient(), error: null as string | null };
  } catch (error) {
    return { supabase: null, error: (error as Error).message };
  }
};

export const getDevCompanyId = async (request: NextRequest) => {
  const raw = await readRawDevCompanyId(request);
  if (!raw) return null;

  const { supabase } = getAdminOrError();
  if (!supabase) return isUuid(raw) ? raw : null;

  return resolveDevCompanyId(supabase, raw);
};

export const jsonDevForbidden = () =>
  NextResponse.json({ ok: false, message: 'Dev session required.' }, { status: 403 });

export const assertDevRequest = (request: NextRequest) => {
  if (!isDevRequest(request)) {
    return jsonDevForbidden();
  }

  return null;
};

export const logDevRequest = async (input: {
  method: string;
  path: string;
  status: number;
  message?: string;
}) => {
  const { supabase } = getAdminOrError();
  if (!supabase) return;

  await supabase.from('dev_api_requests').insert({
    method: input.method,
    path: input.path,
    status: input.status,
    message: input.message ?? null,
  });
};

export const logDevMessage = async (level: string, message: string, details?: unknown) => {
  const { supabase } = getAdminOrError();
  if (!supabase) return;

  await supabase.from('dev_raw_logs').insert({
    level,
    message,
    details: details ?? null,
  });
};

export const readFeatureFlags = async (): Promise<DevFeatureFlag[]> => {
  const { supabase } = getAdminOrError();
  if (!supabase) return defaultFeatureFlags;

  const { data, error } = await supabase
    .from('dev_feature_flags')
    .select('key,label,enabled')
    .order('label');

  if (error || !data || data.length === 0) return defaultFeatureFlags;
  return data as DevFeatureFlag[];
};

export const readDevCompanies = async (): Promise<DevCompany[]> => {
  const { supabase } = getAdminOrError();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('companies')
    .select('id,company_name,company_code')
    .order('company_name');

  if (error) return [];
  return (data ?? []) as DevCompany[];
};

export const readDevApiRequests = async (): Promise<DevApiRequest[]> => {
  const { supabase } = getAdminOrError();
  if (!supabase) return [];

  const { data } = await supabase
    .from('dev_api_requests')
    .select('id,method,path,status,created_at')
    .order('created_at', { ascending: false })
    .limit(8);

  return (data ?? []) as DevApiRequest[];
};

export const readDevRawLogs = async (): Promise<DevRawLog[]> => {
  const { supabase } = getAdminOrError();
  if (!supabase) return [];

  const { data } = await supabase
    .from('dev_raw_logs')
    .select('id,level,message,created_at')
    .order('created_at', { ascending: false })
    .limit(8);

  return (data ?? []) as DevRawLog[];
};

export const readDevTables = async (): Promise<DevTableSummary[]> => {
  const { supabase } = getAdminOrError();
  if (!supabase) {
    return devTableNames.map((name) => ({ name, count: null, status: 'error' }));
  }

  const results = await Promise.all(
    devTableNames.map(async (name) => {
      const probe = await supabase.from(name).select('*').limit(1);
      if (probe.error) {
        return {
          name,
          count: null,
          status: probe.error.code === 'PGRST205' ? 'missing' : 'error',
        } satisfies DevTableSummary;
      }

      const { count } = await supabase.from(name).select('*', { count: 'exact', head: true });
      return {
        name,
        count: count ?? null,
        status: 'ok',
      } satisfies DevTableSummary;
    }),
  );

  return results;
};

const optionalTableMissing = (message?: string) => {
  const normalized = message?.toLowerCase() ?? '';
  return normalized.includes('relation') && normalized.includes('does not exist');
};

/** Dev-only: remove a company and dependent rows blocked by ON DELETE RESTRICT FKs. */
export const deleteCompanyCascade = async (
  supabase: NonNullable<ReturnType<typeof getAdminOrError>['supabase']>,
  companyId: string,
): Promise<{ ok: true } | { ok: false; message: string }> => {
  const { data: company, error: companyLookupError } = await supabase
    .from('companies')
    .select('id, company_name')
    .eq('id', companyId)
    .maybeSingle();

  if (companyLookupError) {
    return { ok: false, message: companyLookupError.message };
  }

  if (!company) {
    return { ok: false, message: 'Company not found.' };
  }

  const { data: pools, error: poolsError } = await supabase
    .from('pools')
    .select('id')
    .eq('company_id', companyId);

  if (poolsError) {
    return { ok: false, message: poolsError.message };
  }

  const poolIds = (pools ?? []).map((pool) => pool.id);

  if (poolIds.length > 0) {
    const { error: logsError } = await supabase.from('chemical_logs').delete().in('pool_id', poolIds);
    if (logsError) {
      return { ok: false, message: logsError.message };
    }
  }

  const dependentDeletes = [
    supabase.from('guard_pool_assignments').delete().eq('company_id', companyId),
    supabase.from('pool_schedule_events').delete().eq('company_id', companyId),
    supabase.from('company_invites').delete().eq('company_id', companyId),
    supabase.from('user_company_memberships').delete().eq('company_id', companyId),
    supabase.from('announcements').delete().eq('company_id', companyId),
    supabase.from('alerts').delete().eq('company_id', companyId),
  ];

  for (const query of dependentDeletes) {
    const { error } = await query;
    if (error && !optionalTableMissing(error.message)) {
      return { ok: false, message: error.message };
    }
  }

  const { error: poolsDeleteError } = await supabase.from('pools').delete().eq('company_id', companyId);
  if (poolsDeleteError) {
    return { ok: false, message: poolsDeleteError.message };
  }

  const unlinkTables = ['users', 'profiles', 'app_accounts'] as const;
  for (const table of unlinkTables) {
    const { error } = await supabase.from(table).update({ company_id: null }).eq('company_id', companyId);
    if (error && !optionalTableMissing(error.message)) {
      return { ok: false, message: error.message };
    }
  }

  const { error: deleteError } = await supabase.from('companies').delete().eq('id', companyId);
  if (deleteError) {
    return { ok: false, message: deleteError.message };
  }

  return { ok: true };
};

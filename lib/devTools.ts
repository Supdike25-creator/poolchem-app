import { NextRequest, NextResponse } from 'next/server';
import { isDevRequest } from '@/lib/auth/devSession';
import { createAdminClient } from '@/lib/supabase/admin';

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
];

export const jsonDevForbidden = () =>
  NextResponse.json({ ok: false, message: 'Dev session required.' }, { status: 403 });

export const assertDevRequest = (request: NextRequest) => {
  if (!isDevRequest(request)) {
    return jsonDevForbidden();
  }

  return null;
};

export const getAdminOrError = () => {
  try {
    return { supabase: createAdminClient(), error: null as string | null };
  } catch (error) {
    return { supabase: null, error: (error as Error).message };
  }
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
      const { count, error } = await supabase.from(name).select('*', { count: 'exact', head: true });
      return {
        name,
        count: count ?? null,
        status: error ? 'error' : 'ok',
      } satisfies DevTableSummary;
    }),
  );

  return results;
};

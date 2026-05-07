'use client';

import { getSupabaseClient } from './supabaseClient';

export type AppRole = 'manager' | 'guard';

export type AppAccount = {
  id: string;
  name: string;
  birthday?: string | null;
  username: string;
  passcode?: string;
  session_token?: string;
  role: AppRole;
  email?: string | null;
  provider?: 'manual' | 'google';
};

export type AppSession = {
  id: string;
  name: string;
  username: string;
  token?: string;
  role: AppRole;
  email?: string | null;
};

const sessionKey = 'chemdeck.session';
export const appSessionCookie = 'chemdeck_app_session';

const managerRoles = new Set(['admin', 'manager', 'supervisor']);

export const normalizeAppRole = (role?: string | null): AppRole => {
  if (!role) return 'guard';
  return managerRoles.has(role.toLowerCase()) ? 'manager' : 'guard';
};

export const getAppBaseUrl = () => {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configuredUrl) return configuredUrl.replace(/\/$/, '');

  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  return '';
};

const readJson = <T,>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key: string, value: unknown) => {
  window.localStorage.setItem(key, JSON.stringify(value));
};

const firstRow = <T,>(data: T[] | T | null): T | null => {
  if (!data) return null;
  return Array.isArray(data) ? data[0] ?? null : data;
};

export const getStoredSession = () => readJson<AppSession | null>(sessionKey, null);

export const setAppSession = (account: AppAccount) => {
  const session: AppSession = {
    id: account.id,
    name: account.name,
    username: account.username,
    token: account.session_token,
    role: account.role,
    email: account.email,
  };

  writeJson(sessionKey, session);
  document.cookie = `${appSessionCookie}=${encodeURIComponent(JSON.stringify(session))}; path=/; max-age=2592000; samesite=lax`;
  return session;
};

export const clearAppSession = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(sessionKey);
  document.cookie = `${appSessionCookie}=; path=/; max-age=0; samesite=lax`;
};

export const sendAccountMagicLink = async (email: string, shouldCreateUser = true, redirectTo = `${getAppBaseUrl()}/login`) => {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: {
      emailRedirectTo: redirectTo,
      shouldCreateUser,
    },
  });

  if (error) {
    throw new Error(error.message);
  }
};

export const startAccountSignup = async ({
  name,
  birthday,
  email,
  role,
}: {
  name: string;
  birthday: string;
  email: string;
  role: AppRole;
}) => {
  const supabase = getSupabaseClient();
  const { error } = await supabase.rpc('start_app_account_signup', {
    p_name: name.trim(),
    p_birthday: birthday,
    p_email: email.trim().toLowerCase(),
    p_role: role,
  });

  if (error) {
    throw new Error(error.message);
  }
};

export const createManualAccount = async (name?: string, birthday?: string | null, role?: AppRole | null) => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc('create_app_account', {
    p_name: name?.trim() || null,
    p_birthday: birthday || null,
    p_role: role ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }

  const account = firstRow<AppAccount>(data as AppAccount[] | null);
  if (!account) {
    throw new Error('Account could not be created.');
  }

  account.role = normalizeAppRole(account.role);
  setAppSession(account);
  return account;
};

export const recoverAccount = async () => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc('recover_app_account');

  if (error) {
    throw new Error(error.message);
  }

  const account = firstRow<AppAccount>(data as AppAccount[] | null);
  if (!account) {
    throw new Error('Account could not be recovered.');
  }

  account.role = normalizeAppRole(account.role);
  setAppSession(account);
  return account;
};

export const createOrUpdateGoogleAccount = async ({
  id,
  name,
  email,
  role,
}: {
  id: string;
  name: string;
  email?: string;
  role: AppRole;
}) => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc('create_google_app_account', {
    p_auth_user_id: id,
    p_name: name,
    p_email: email ?? null,
    p_role: role,
  });

  if (error) {
    throw new Error(error.message);
  }

  const account = firstRow<AppAccount>(data as AppAccount[] | null);
  if (!account) {
    throw new Error('Google account could not be created.');
  }

  account.role = normalizeAppRole(account.role);
  setAppSession(account);
  return account;
};

export const findAccount = async (username: string, passcode: string) => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc('verify_app_account', {
    p_username: username.trim(),
    p_passcode: passcode.trim(),
  });

  if (error) {
    throw new Error(error.message);
  }

  const account = firstRow<AppAccount>(data as AppAccount[] | null);
  if (!account) return null;

  account.role = normalizeAppRole(account.role);
  return account;
};

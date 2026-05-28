import { randomBytes } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { routeForRole, normalizeProfileRole } from '@/lib/auth/accountAccess';
import { createAdminClient } from '@/lib/supabase/admin';
import { upsertCompanyMembership } from '@/lib/companyMemberships';
import { getAppBaseUrl } from '@/lib/inviteLinks';

export type CompanyInviteRow = {
  id: string;
  company_id: string;
  email: string;
  token: string;
  invited_role: string;
  status: string;
  expires_at: string;
  created_at: string;
  accepted_at?: string | null;
  accepted_by?: string | null;
  companies?: { company_name?: string | null } | null;
};

export type InvitePreview = {
  ok: true;
  email: string;
  company_id: string;
  company_name: string;
  expires_at: string;
  status: string;
};

export type AcceptInviteResult =
  | {
      ok: true;
      message: string;
      redirectTo: string;
      company_name: string;
      switched_company?: boolean;
    }
  | { ok: false; message: string; status?: number };

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const generateInviteToken = () => randomBytes(24).toString('hex');

export const buildInviteUrl = (token: string, origin: string) =>
  `${getAppBaseUrl(origin)}/invite/${token.trim()}`;

export const normalizeInviteEmail = (value: string) => value.trim().toLowerCase();

export const isInviteEmailValid = (value: string) => emailPattern.test(normalizeInviteEmail(value));

const inviteSelect = `
  id,
  company_id,
  email,
  token,
  invited_role,
  status,
  expires_at,
  created_at,
  accepted_at,
  accepted_by,
  companies ( company_name )
`;

export async function getInviteByToken(
  db: SupabaseClient,
  token: string,
): Promise<CompanyInviteRow | null> {
  const normalized = token.trim();
  if (!normalized) return null;

  const { data, error } = await db
    .from('company_invites')
    .select(inviteSelect)
    .eq('token', normalized)
    .maybeSingle();

  if (error || !data) return null;
  return data as CompanyInviteRow;
}

export function previewInvite(invite: CompanyInviteRow): InvitePreview | { ok: false; message: string } {
  const companyName = invite.companies?.company_name?.trim() || 'your company';
  const status = invite.status.toLowerCase();

  if (status === 'accepted') {
    return { ok: false, message: 'This invite has already been used.' };
  }

  if (status === 'revoked') {
    return { ok: false, message: 'This invite was cancelled. Ask your supervisor for a new one.' };
  }

  if (status === 'expired' || new Date(invite.expires_at).getTime() < Date.now()) {
    return { ok: false, message: 'This invite has expired. Ask your supervisor for a new one.' };
  }

  return {
    ok: true,
    email: invite.email,
    company_id: invite.company_id,
    company_name: companyName,
    expires_at: invite.expires_at,
    status: invite.status,
  };
}

async function upsertInvitedUserProfile(
  db: SupabaseClient,
  userId: string,
  email: string,
  fullName: string | null,
  companyId: string,
) {
  const payload = {
    id: userId,
    email,
    full_name: fullName || email,
    role: 'guard',
    status: 'active',
    active: true,
    company_id: companyId,
  };

  const fallbackPayload = {
    id: userId,
    email,
    full_name: fullName || email,
    role: 'guard',
    status: 'active',
    company_id: companyId,
  };

  const usersResult = await db.from('users').upsert(payload, { onConflict: 'id' });
  if (usersResult.error?.message?.toLowerCase().includes('column')) {
    await db.from('users').upsert(fallbackPayload, { onConflict: 'id' });
  }

  const profilesResult = await db.from('profiles').upsert(payload, { onConflict: 'id' });
  if (profilesResult.error?.message?.toLowerCase().includes('column')) {
    await db.from('profiles').upsert(fallbackPayload, { onConflict: 'id' });
  }

  await db
    .from('app_accounts')
    .update({ company_id: companyId, role: 'guard' })
    .eq('auth_user_id', userId);
}

async function updateAuthCompanyMetadata(userId: string, companyId: string) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return;

  const admin = createAdminClient();
  const { data } = await admin.auth.admin.getUserById(userId);
  const currentUser = data.user;

  await admin.auth.admin.updateUserById(userId, {
    app_metadata: {
      ...(currentUser?.app_metadata ?? {}),
      company_id: companyId,
    },
    user_metadata: {
      ...(currentUser?.user_metadata ?? {}),
      company_id: companyId,
      role: 'guard',
    },
  });
}

export async function acceptCompanyInvite(
  db: SupabaseClient,
  params: {
    token: string;
    userId: string;
    userEmail: string;
    fullName?: string | null;
  },
): Promise<AcceptInviteResult> {
  const invite = await getInviteByToken(db, params.token);
  if (!invite) {
    return { ok: false, message: 'Invite not found.', status: 404 };
  }

  const preview = previewInvite(invite);
  if (!preview.ok) {
    if (
      invite.status.toLowerCase() === 'accepted' &&
      invite.accepted_by === params.userId
    ) {
      const companyName = invite.companies?.company_name?.trim() || 'your company';
      return {
        ok: true,
        message: `You're already part of ${companyName}.`,
        company_name: companyName,
        redirectTo: routeForRole(normalizeProfileRole('guard')),
      };
    }

    return { ok: false, message: preview.message, status: 400 };
  }

  const inviteEmail = normalizeInviteEmail(invite.email);
  const sessionEmail = normalizeInviteEmail(params.userEmail);

  if (inviteEmail !== sessionEmail) {
    return {
      ok: false,
      message: `This invite was sent to ${invite.email}. Sign in with that email to continue.`,
      status: 403,
    };
  }

  const { data: existingUser } = await db
    .from('users')
    .select('id, company_id, role, full_name')
    .eq('id', params.userId)
    .maybeSingle();

  const switchedCompany = Boolean(
    existingUser?.company_id && existingUser.company_id !== invite.company_id,
  );

  if (existingUser?.company_id && existingUser.company_id !== invite.company_id) {
    await upsertCompanyMembership(db, {
      userId: params.userId,
      companyId: existingUser.company_id,
      role: existingUser.role ?? 'guard',
    });
  }

  await upsertInvitedUserProfile(
    db,
    params.userId,
    sessionEmail,
    params.fullName?.trim() || existingUser?.full_name || null,
    invite.company_id,
  );

  await upsertCompanyMembership(db, {
    userId: params.userId,
    companyId: invite.company_id,
    role: 'guard',
  });

  await db
    .from('company_invites')
    .update({
      status: 'accepted',
      accepted_by: params.userId,
      accepted_at: new Date().toISOString(),
    })
    .eq('id', invite.id);

  await updateAuthCompanyMetadata(params.userId, invite.company_id);

  const companyName = invite.companies?.company_name?.trim() || 'your company';

  return {
    ok: true,
    message: switchedCompany
      ? `Welcome to ${companyName}! You can switch companies anytime in Settings.`
      : `Welcome to ${companyName}!`,
    company_name: companyName,
    redirectTo: routeForRole(normalizeProfileRole('guard')),
    switched_company: switchedCompany,
  };
}

export async function createCompanyInvite(
  db: SupabaseClient,
  params: {
    companyId: string;
    email: string;
    createdBy?: string | null;
  },
) {
  const email = normalizeInviteEmail(params.email);
  const token = generateInviteToken();

  const { data: pendingInvite } = await db
    .from('company_invites')
    .select('id, token')
    .eq('company_id', params.companyId)
    .eq('email', email)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (pendingInvite?.token) {
    return { invite: pendingInvite, token: pendingInvite.token, reused: true };
  }

  const { data, error } = await db
    .from('company_invites')
    .insert({
      company_id: params.companyId,
      email,
      token,
      invited_role: 'guard',
      status: 'pending',
      created_by: params.createdBy ?? null,
    })
    .select('id, token')
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Unable to create invite.');
  }

  return { invite: data, token: data.token, reused: false };
}

export async function listPendingInvites(db: SupabaseClient, companyId: string) {
  const { data, error } = await db
    .from('company_invites')
    .select('id, email, status, expires_at, created_at, token')
    .eq('company_id', companyId)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function getPendingInviteById(
  db: SupabaseClient,
  companyId: string,
  inviteId: string,
) {
  const { data, error } = await db
    .from('company_invites')
    .select('id, email, token, status, expires_at, company_id')
    .eq('id', inviteId)
    .eq('company_id', companyId)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

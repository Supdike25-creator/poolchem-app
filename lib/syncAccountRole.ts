import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

type AccountRole = 'manager' | 'employee';

const optionalColumnMissing = (message?: string) => {
  const normalized = message?.toLowerCase() ?? '';
  return normalized.includes('column') && normalized.includes('does not exist');
};

const optionalTableMissing = (message?: string) => {
  const normalized = message?.toLowerCase() ?? '';
  return normalized.includes('relation') && normalized.includes('does not exist');
};

export async function syncAccountRole(
  userId: string,
  email: string,
  role: AccountRole,
  fullName?: string | null,
) {
  const serviceRoleConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  const db = serviceRoleConfigured ? createAdminClient() : await createClient();
  const displayName = fullName?.trim() || email;

  const userUpdate = {
    email,
    full_name: displayName,
    role,
    status: 'active',
    active: true,
  };

  let userResult = await db.from('users').update(userUpdate).eq('id', userId).select('id');

  if (userResult.error && optionalColumnMissing(userResult.error.message)) {
    const { active: _active, ...withoutActive } = userUpdate;
    userResult = await db.from('users').update(withoutActive).eq('id', userId).select('id');
  }

  if (!userResult.error && (!userResult.data || userResult.data.length === 0)) {
    userResult = await db.from('users').insert({ id: userId, ...userUpdate }).select('id');
    if (userResult.error && optionalColumnMissing(userResult.error.message)) {
      const { active: _active, ...withoutActive } = userUpdate;
      userResult = await db.from('users').insert({ id: userId, ...withoutActive }).select('id');
    }
  }

  const profileUpdate = {
    email,
    full_name: displayName,
    role,
    status: 'active',
  };

  let profileResult = await db.from('profiles').update(profileUpdate).eq('id', userId).select('id');

  if (!profileResult.error && (!profileResult.data || profileResult.data.length === 0)) {
    profileResult = await db
      .from('profiles')
      .insert({ id: userId, ...profileUpdate })
      .select('id');
  }

  if (userResult.error) {
    if (optionalTableMissing(userResult.error.message)) {
      return { ok: false as const, message: 'Users table is missing. Run the account schema migration first.' };
    }
    return { ok: false as const, message: userResult.error.message };
  }

  if (profileResult.error && !optionalTableMissing(profileResult.error.message)) {
    return { ok: false as const, message: profileResult.error.message };
  }

  return { ok: true as const };
}

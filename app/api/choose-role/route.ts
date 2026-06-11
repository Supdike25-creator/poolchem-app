import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { syncAccountRole } from '@/lib/syncAccountRole';

export const dynamic = 'force-dynamic';

const validRoles = new Set(['manager', 'employee']);

const jsonError = (message: string, status = 400) =>
  NextResponse.json({ ok: false, message }, { status });

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return jsonError('Sign in before choosing a role.', 401);
  }

  const body = await request.json().catch(() => null) as { role?: string } | null;
  const role = body?.role?.trim().toLowerCase();

  if (!role || !validRoles.has(role)) {
    return jsonError('Choose Manager or Employee.');
  }

  const selectedRole = role as 'manager' | 'employee';
  const email = user.email?.trim().toLowerCase() || `${user.id}@chemdeck.local`;
  const fullName =
    typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : null;

  const syncResult = await syncAccountRole(user.id, email, selectedRole, fullName);
  if (!syncResult.ok) {
    return jsonError(syncResult.message, 500);
  }

  const response = NextResponse.json({
    ok: true,
    role: selectedRole,
    redirectTo: selectedRole === 'manager' ? '/create-company' : '/choose-role',
  });

  if (selectedRole === 'manager') {
    response.cookies.set('chemdeck.pendingRole', selectedRole, {
      path: '/',
      maxAge: 600,
      sameSite: 'lax',
    });
  } else {
    response.cookies.delete('chemdeck.pendingRole');
  }

  return response;
}

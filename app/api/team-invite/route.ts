import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildJoinInviteLink } from '@/lib/inviteLinks';

export const dynamic = 'force-dynamic';

const managerRoles = new Set(['boss', 'manager', 'admin', 'supervisor', 'owner']);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getManagerContext = async () => {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { error: NextResponse.json({ ok: false, message: 'Unauthorized.' }, { status: 401 }) };
  }

  const db = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : supabase;
  const { data: account } = await db
    .from('users')
    .select('id, role, company_id, full_name')
    .eq('id', user.id)
    .maybeSingle();

  const companyId = account?.company_id ?? null;
  const role = String(account?.role ?? '').toLowerCase();

  if (!companyId || !managerRoles.has(role)) {
    return { error: NextResponse.json({ ok: false, message: 'Manager access required.' }, { status: 403 }) };
  }

  return { user, companyId, db, inviterName: account?.full_name || user.email || 'Your manager' };
};

export async function GET(request: NextRequest) {
  const context = await getManagerContext();
  if ('error' in context && context.error) return context.error;

  const { companyId, db } = context;
  const { data: company, error } = await db
    .from('companies')
    .select('company_code, company_name')
    .eq('id', companyId)
    .maybeSingle();

  if (error || !company?.company_code) {
    return NextResponse.json({ ok: false, message: error?.message || 'Company code not found.' }, { status: 404 });
  }

  const origin = request.nextUrl.origin;
  return NextResponse.json({
    ok: true,
    company_code: company.company_code,
    company_name: company.company_name,
    signup_link: `${origin}/create-account?role=guard&code=${encodeURIComponent(company.company_code)}`,
    join_link: buildJoinInviteLink(company.company_code, origin),
  });
}

export async function POST(request: NextRequest) {
  const context = await getManagerContext();
  if ('error' in context && context.error) return context.error;

  const body = await request.json().catch(() => null) as { email?: string } | null;
  const email = body?.email?.trim().toLowerCase() ?? '';

  if (!emailPattern.test(email)) {
    return NextResponse.json({ ok: false, message: 'Enter a valid email address.' }, { status: 400 });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ ok: false, message: 'Email invites require server configuration.' }, { status: 503 });
  }

  const { companyId, db, inviterName } = context;
  const { data: company, error: companyError } = await db
    .from('companies')
    .select('company_code, company_name')
    .eq('id', companyId)
    .maybeSingle();

  if (companyError || !company?.company_code) {
    return NextResponse.json({ ok: false, message: companyError?.message || 'Company code not found.' }, { status: 404 });
  }

  const origin = request.nextUrl.origin;
  const joinPath = `/enter-company-code?code=${encodeURIComponent(company.company_code)}`;
  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(joinPath)}`;
  const admin = createAdminClient();

  const inviteResult = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: {
      pending_role: 'guard',
      company_code: company.company_code,
      invited_by: inviterName,
    },
  });

  if (!inviteResult.error) {
    return NextResponse.json({
      ok: true,
      message: `Invite email sent to ${email}.`,
      delivery: 'invite',
    });
  }

  const alreadyRegistered = inviteResult.error.message.toLowerCase().includes('already');
  if (!alreadyRegistered) {
    return NextResponse.json({ ok: false, message: inviteResult.error.message }, { status: 400 });
  }

  const otpResult = await admin.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo,
      data: {
        pending_role: 'guard',
        company_code: company.company_code,
      },
    },
  });

  if (otpResult.error) {
    return NextResponse.json({ ok: false, message: otpResult.error.message }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    message: `Login link sent to ${email}. They can join ${company.company_name || 'your company'} with code ${company.company_code}.`,
    delivery: 'magiclink',
  });
}

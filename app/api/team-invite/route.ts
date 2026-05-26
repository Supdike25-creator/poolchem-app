import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildJoinInviteLink } from '@/lib/inviteLinks';
import { resolveManagerApiScope } from '@/lib/managerApiScope';

export const dynamic = 'force-dynamic';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET(request: NextRequest) {
  const context = await resolveManagerApiScope(request);
  if (!context.ok) return context.response;

  const { companyId, accountDb } = context.scope;
  const { data: company, error } = await accountDb
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
  const context = await resolveManagerApiScope(request);
  if (!context.ok) return context.response;

  const body = await request.json().catch(() => null) as { email?: string; companyId?: string } | null;
  const email = body?.email?.trim().toLowerCase() ?? '';

  if (!emailPattern.test(email)) {
    return NextResponse.json({ ok: false, message: 'Enter a valid email address.' }, { status: 400 });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ ok: false, message: 'Email invites require server configuration.' }, { status: 503 });
  }

  const { companyId, accountDb, inviterName } = context.scope;
  const { data: company, error: companyError } = await accountDb
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

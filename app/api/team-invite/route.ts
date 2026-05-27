import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildInviteUrl, createCompanyInvite, isInviteEmailValid, listPendingInvites } from '@/lib/companyInvites';
import { inviteEmailHasAccount, sendInviteEmail } from '@/lib/inviteEmail';
import { resolveManagerApiScope } from '@/lib/managerApiScope';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const context = await resolveManagerApiScope(request);
  if (!context.ok) return context.response;

  const { companyId, accountDb } = context.scope;
  const origin = request.nextUrl.origin;

  const [{ data: company, error }, pendingInvites] = await Promise.all([
    accountDb.from('companies').select('company_name').eq('id', companyId).maybeSingle(),
    listPendingInvites(accountDb, companyId).catch(() => []),
  ]);

  if (error || !company) {
    return NextResponse.json({ ok: false, message: error?.message || 'Company not found.' }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    company_name: company.company_name,
    pending_invites: pendingInvites.map((invite) => ({
      id: invite.id,
      email: invite.email,
      expires_at: invite.expires_at,
      created_at: invite.created_at,
      invite_link: buildInviteUrl(invite.token, origin),
    })),
  });
}

export async function POST(request: NextRequest) {
  const context = await resolveManagerApiScope(request);
  if (!context.ok) return context.response;

  const body = await request.json().catch(() => null) as {
    email?: string;
    delivery?: 'email' | 'link';
    companyId?: string;
  } | null;

  const email = body?.email?.trim() ?? '';
  const delivery = body?.delivery === 'link' ? 'link' : 'email';

  if (!isInviteEmailValid(email)) {
    return NextResponse.json({ ok: false, message: 'Enter a valid email address.' }, { status: 400 });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ ok: false, message: 'Email invites require server configuration.' }, { status: 503 });
  }

  const { companyId, accountDb, inviterName, userId } = context.scope;
  const origin = request.nextUrl.origin;

  const { data: company, error: companyError } = await accountDb
    .from('companies')
    .select('company_name')
    .eq('id', companyId)
    .maybeSingle();

  if (companyError || !company) {
    return NextResponse.json({ ok: false, message: companyError?.message || 'Company not found.' }, { status: 404 });
  }

  try {
    const admin = createAdminClient();
    const { token } = await createCompanyInvite(admin, {
      companyId,
      email,
      createdBy: userId,
    });

    const inviteLink = buildInviteUrl(token, origin);
    const hasAccount = await inviteEmailHasAccount(admin, email);

    if (delivery === 'link') {
      return NextResponse.json({
        ok: true,
        message: `Invite link ready for ${email}.`,
        invite_link: inviteLink,
        delivery: 'link',
        has_account: hasAccount,
      });
    }

    const emailResult = await sendInviteEmail({
      to: email,
      companyName: company.company_name,
      inviterName,
      token,
      origin,
      hasAccount,
    });

    if (!emailResult.ok) {
      return NextResponse.json(
        {
          ok: false,
          message: emailResult.message,
          invite_link: inviteLink,
        },
        { status: emailResult.message.includes('RESEND_API_KEY') ? 503 : 400 },
      );
    }

    return NextResponse.json({
      ok: true,
      message: `Invite email sent to ${email}.`,
      invite_link: inviteLink,
      delivery: 'email',
      has_account: hasAccount,
    });
  } catch (error) {
    const message = (error as Error).message || 'Unable to send invite.';
    if (message.toLowerCase().includes('company_invites')) {
      return NextResponse.json(
        { ok: false, message: 'Run SUPABASE_COMPANY_INVITES.sql in Supabase first.' },
        { status: 503 },
      );
    }
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

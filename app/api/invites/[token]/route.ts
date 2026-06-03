import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getInviteByToken, previewInvite } from '@/lib/companyInvites';
import { inviteEmailHasAccount } from '@/lib/inviteEmail';

export const dynamic = 'force-dynamic';

const invitesConfigured = () =>
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;

  if (!invitesConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        message:
          'Invites are not configured on the server. Add SUPABASE_SERVICE_ROLE_KEY in Vercel and redeploy.',
      },
      { status: 503 },
    );
  }

  try {
    const db = createAdminClient();
    const invite = await getInviteByToken(db, token);

    if (!invite) {
      return NextResponse.json(
        {
          ok: false,
          message:
            'Invite not found. Ask your manager to resend the invite, or use Copy invite link from the Team page.',
        },
        { status: 404 },
      );
    }

    const preview = previewInvite(invite);
    if (!preview.ok) {
      return NextResponse.json({ ok: false, message: preview.message }, { status: 400 });
    }

    const hasAccount = await inviteEmailHasAccount(db, preview.email);

    return NextResponse.json({ ok: true, invite: preview, has_account: hasAccount });
  } catch (error) {
    const message = (error as Error).message || 'Unable to load invite.';
    if (message.toLowerCase().includes('company_invites')) {
      return NextResponse.json(
        {
          ok: false,
          message:
            'The invites table is missing. Run SUPABASE_COMPANY_INVITES.sql (or SUPABASE_RUN_ALL.sql) in Supabase.',
        },
        { status: 503 },
      );
    }
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

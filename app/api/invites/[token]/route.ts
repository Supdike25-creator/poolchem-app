import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getInviteByToken, previewInvite } from '@/lib/companyInvites';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ ok: false, message: 'Invites are not configured.' }, { status: 503 });
  }

  try {
    const db = createAdminClient();
    const invite = await getInviteByToken(db, token);

    if (!invite) {
      return NextResponse.json({ ok: false, message: 'Invite not found.' }, { status: 404 });
    }

    const preview = previewInvite(invite);
    if (!preview.ok) {
      return NextResponse.json({ ok: false, message: preview.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, invite: preview });
  } catch (error) {
    const message = (error as Error).message || 'Unable to load invite.';
    if (message.toLowerCase().includes('company_invites')) {
      return NextResponse.json(
        { ok: false, message: 'Run SUPABASE_COMPANY_INVITES.sql in Supabase first.' },
        { status: 503 },
      );
    }
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { acceptCompanyInvite } from '@/lib/companyInvites';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ ok: false, message: 'Sign in to accept your invite.' }, { status: 401 });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ ok: false, message: 'Invites are not configured.' }, { status: 503 });
  }

  const body = await request.json().catch(() => null) as { token?: string; full_name?: string } | null;
  const token = body?.token?.trim();

  if (!token) {
    return NextResponse.json({ ok: false, message: 'Missing invite token.' }, { status: 400 });
  }

  try {
    const db = createAdminClient();
    const result = await acceptCompanyInvite(db, {
      token,
      userId: user.id,
      userEmail: user.email || '',
      fullName: body?.full_name ?? null,
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, message: result.message }, { status: result.status ?? 400 });
    }

    const response = NextResponse.json(result);
    response.cookies.delete('chemdeck.pendingRole');
    return response;
  } catch (error) {
    const message = (error as Error).message || 'Unable to accept invite.';
    if (message.toLowerCase().includes('company_invites')) {
      return NextResponse.json(
        { ok: false, message: 'Run SUPABASE_COMPANY_INVITES.sql in Supabase first.' },
        { status: 503 },
      );
    }
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

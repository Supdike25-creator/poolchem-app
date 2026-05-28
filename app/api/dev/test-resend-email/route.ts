import { NextRequest, NextResponse } from 'next/server';
import { assertDevRequest, logDevMessage, logDevRequest } from '@/lib/devTools';
import { normalizeInviteEmail } from '@/lib/companyInvites';
import { getAppBaseUrl } from '@/lib/inviteLinks';
import { isResendTestModeError, sendInviteEmail } from '@/lib/inviteEmail';

export const dynamic = 'force-dynamic';

const defaultTestEmail = 'supdike25@hotmail.com';

export async function GET(request: NextRequest) {
  const forbidden = assertDevRequest(request);
  if (forbidden) return forbidden;

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.INVITE_EMAIL_FROM?.trim() || 'ChemDeck <onboarding@resend.dev>';
  const appUrl = getAppBaseUrl(request.nextUrl.origin);

  return NextResponse.json({
    ok: Boolean(apiKey),
    message: apiKey ? 'Resend is configured.' : 'Add RESEND_API_KEY in Vercel.',
    details: {
      resend_api_key: apiKey ? `set (${apiKey.slice(0, 6)}…)` : 'missing',
      invite_email_from: from,
      app_url: appUrl,
      test_mode_note:
        'Without a verified domain, Resend only delivers to your Resend account email (supdike25@hotmail.com). Check spam/junk too.',
    },
  });
}

export async function POST(request: NextRequest) {
  const forbidden = assertDevRequest(request);
  if (forbidden) return forbidden;

  const body = await request.json().catch(() => null) as { email?: string } | null;
  const to = normalizeInviteEmail(body?.email?.trim() || defaultTestEmail);
  const origin = getAppBaseUrl(request.nextUrl.origin);
  const from = process.env.INVITE_EMAIL_FROM?.trim() || 'ChemDeck <onboarding@resend.dev>';
  const apiKey = process.env.RESEND_API_KEY?.trim();

  if (!apiKey) {
    await logDevRequest({ method: 'POST', path: '/api/dev/test-resend-email', status: 503 });
    return NextResponse.json(
      {
        ok: false,
        message: 'RESEND_API_KEY is not set in Vercel.',
        details: { invite_email_from: from, app_url: origin },
      },
      { status: 503 },
    );
  }

  const token = 'dev-test';
  const result = await sendInviteEmail({
    to,
    companyName: 'ChemDeck Dev Test',
    inviterName: 'Dev Dashboard',
    token,
    origin,
    hasAccount: false,
  });

  const status = result.ok ? 200 : isResendTestModeError(result.message) ? 400 : 502;
  await logDevRequest({ method: 'POST', path: '/api/dev/test-resend-email', status, message: result.message });
  await logDevMessage(result.ok ? 'info' : 'error', result.message, { to, from, app_url: origin });

  return NextResponse.json(
    {
      ok: result.ok,
      message: result.message,
      details: {
        to,
        from,
        app_url: origin,
        resend_test_mode: result.resend_test_mode ?? false,
        resend_id: 'id' in result ? result.id : undefined,
      },
    },
    { status },
  );
}

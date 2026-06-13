import { NextRequest, NextResponse } from 'next/server';
import { buildChemDeckEmailHtml, sendResendEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

const notifyEmail = () =>
  process.env.DEMO_NOTIFY_EMAIL?.trim() || process.env.CONTACT_EMAIL?.trim() || 'ChemdeckCo@gmail.com';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as {
    email?: string;
    focus?: string;
    scheduledDate?: string | null;
    scheduledTime?: string | null;
    scheduledLabel?: string | null;
    manualSchedule?: string | null;
  } | null;

  const email = body?.email?.trim().toLowerCase() ?? '';
  const focus = body?.focus === 'employees' ? 'employees' : body?.focus === 'pools' ? 'pools' : null;
  const scheduledLabel = body?.scheduledLabel?.trim() || null;
  const manualSchedule = body?.manualSchedule?.trim() || null;
  const hasCalendarPick = Boolean(body?.scheduledDate && body?.scheduledTime);

  if (!emailPattern.test(email)) {
    return NextResponse.json({ ok: false, message: 'Enter a valid email address.' }, { status: 400 });
  }

  if (!focus) {
    return NextResponse.json({ ok: false, message: 'Choose a demo focus.' }, { status: 400 });
  }

  if (!hasCalendarPick && !manualSchedule) {
    return NextResponse.json({ ok: false, message: 'Pick a date and time or type your preference.' }, { status: 400 });
  }

  const focusLabel = focus === 'pools' ? 'Pools & compliance' : 'Employees & team';
  const whenLabel = scheduledLabel || manualSchedule || 'Not specified';
  const scheduleSource = scheduledLabel ? 'Calendar picker' : 'Typed preference';

  const html = buildChemDeckEmailHtml({
    eyebrow: 'Demo request',
    title: 'New ChemDeck demo scheduled',
    bodyHtml: `
      <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#334155;">
        Someone requested a live ChemDeck demo from the marketing site.
      </p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:16px 0 0;border-collapse:collapse;">
        <tr><td style="padding:8px 0;font-size:14px;color:#64748b;width:140px;">Email</td><td style="padding:8px 0;font-size:14px;color:#0f172a;font-weight:600;">${email}</td></tr>
        <tr><td style="padding:8px 0;font-size:14px;color:#64748b;">Focus</td><td style="padding:8px 0;font-size:14px;color:#0f172a;font-weight:600;">${focusLabel}</td></tr>
        <tr><td style="padding:8px 0;font-size:14px;color:#64748b;">When</td><td style="padding:8px 0;font-size:14px;color:#0f172a;font-weight:600;">${whenLabel}</td></tr>
        <tr><td style="padding:8px 0;font-size:14px;color:#64748b;">Source</td><td style="padding:8px 0;font-size:14px;color:#0f172a;">${scheduleSource}</td></tr>
      </table>
    `,
    footer: 'Reply to this lead from your inbox to confirm the demo time.',
  });

  const text = [
    'New ChemDeck demo request',
    `Email: ${email}`,
    `Focus: ${focusLabel}`,
    `When: ${whenLabel}`,
    `Source: ${scheduleSource}`,
  ].join('\n');

  const notifyResult = await sendResendEmail({
    to: notifyEmail(),
    subject: `ChemDeck demo request — ${email}`,
    html,
    text,
  });

  if (!notifyResult.ok) {
    return NextResponse.json(
      { ok: false, message: notifyResult.message || 'Unable to send demo request right now.' },
      { status: 503 },
    );
  }

  const confirmationHtml = buildChemDeckEmailHtml({
    eyebrow: 'ChemDeck demo',
    title: 'We received your demo request',
    bodyHtml: `
      <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#334155;">
        Thanks for scheduling a ChemDeck demo. Our team will follow up at this address to confirm your session.
      </p>
      <p style="margin:0;font-size:14px;line-height:1.6;color:#334155;">
        <strong>Focus:</strong> ${focusLabel}<br />
        <strong>Requested time:</strong> ${whenLabel}
      </p>
    `,
    footer: 'If you need to make a change, reply to this email.',
  });

  await sendResendEmail({
    to: email,
    subject: 'ChemDeck demo request received',
    html: confirmationHtml,
    text: `Thanks for requesting a ChemDeck demo.\nFocus: ${focusLabel}\nRequested time: ${whenLabel}`,
  }).catch(() => null);

  return NextResponse.json({ ok: true, message: 'Demo request received.' });
}

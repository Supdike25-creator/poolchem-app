import { NextRequest, NextResponse } from 'next/server';
import { buildChemDeckEmailHtml, sendResendEmail } from '@/lib/email';
import {
  demoTopicOptions,
  formatDemoTopics,
  saveDemoRequest,
  type DemoTopicId,
} from '@/lib/demoRequests';

export const dynamic = 'force-dynamic';

const notifyEmail = () =>
  process.env.DEMO_NOTIFY_EMAIL?.trim() || process.env.CONTACT_EMAIL?.trim() || 'ChemdeckCo@gmail.com';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const validTopicIds = new Set(demoTopicOptions.map((topic) => topic.id));

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as {
    email?: string;
    topics?: string[];
    scheduledDate?: string | null;
    scheduledTime?: string | null;
    scheduledLabel?: string | null;
    schedulingNotes?: string | null;
  } | null;

  const email = body?.email?.trim().toLowerCase() ?? '';
  const topics = (body?.topics ?? []).filter((topic): topic is DemoTopicId => validTopicIds.has(topic as DemoTopicId));
  const scheduledLabel = body?.scheduledLabel?.trim() || null;
  const schedulingNotes = body?.schedulingNotes?.trim() || null;
  const hasCalendarPick = Boolean(body?.scheduledDate && body?.scheduledTime);

  if (!emailPattern.test(email)) {
    return NextResponse.json({ ok: false, message: 'Enter a valid email address.' }, { status: 400 });
  }

  if (topics.length === 0) {
    return NextResponse.json({ ok: false, message: 'Select at least one demo topic.' }, { status: 400 });
  }

  if (!hasCalendarPick && !schedulingNotes) {
    return NextResponse.json(
      { ok: false, message: 'Select a date and time or add scheduling notes.' },
      { status: 400 },
    );
  }

  const topicsLabel = formatDemoTopics(topics);
  const whenLabel =
    [scheduledLabel, schedulingNotes].filter(Boolean).join(schedulingNotes && scheduledLabel ? ' · Notes: ' : '') ||
    'Not specified';

  await saveDemoRequest({
    email,
    topics,
    scheduledDate: body?.scheduledDate ?? null,
    scheduledTime: body?.scheduledTime ?? null,
    scheduledLabel,
    schedulingNotes,
  });

  const html = buildChemDeckEmailHtml({
    eyebrow: 'Demo request',
    title: 'New ChemDeck demo scheduled',
    bodyHtml: `
      <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#334155;">
        Someone requested a live ChemDeck demo from the marketing site.
      </p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:16px 0 0;border-collapse:collapse;">
        <tr><td style="padding:8px 0;font-size:14px;color:#64748b;width:140px;">Email</td><td style="padding:8px 0;font-size:14px;color:#0f172a;font-weight:600;">${email}</td></tr>
        <tr><td style="padding:8px 0;font-size:14px;color:#64748b;">Topics</td><td style="padding:8px 0;font-size:14px;color:#0f172a;font-weight:600;">${topicsLabel}</td></tr>
        <tr><td style="padding:8px 0;font-size:14px;color:#64748b;">Requested time</td><td style="padding:8px 0;font-size:14px;color:#0f172a;font-weight:600;">${whenLabel}</td></tr>
      </table>
      <p style="margin:16px 0 0;font-size:13px;line-height:1.5;color:#64748b;">View all requests in Dev Dash → Demo requests.</p>
    `,
    footer: 'Reply to this lead from your inbox to confirm the demo time.',
  });

  const text = [
    'New ChemDeck demo request',
    `Email: ${email}`,
    `Topics: ${topicsLabel}`,
    `Requested time: ${whenLabel}`,
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
        <strong>Topics:</strong> ${topicsLabel}<br />
        <strong>Requested time:</strong> ${whenLabel}
      </p>
    `,
    footer: 'If you need to make a change, reply to this email.',
  });

  await sendResendEmail({
    to: email,
    subject: 'ChemDeck demo request received',
    html: confirmationHtml,
    text: `Thanks for requesting a ChemDeck demo.\nTopics: ${topicsLabel}\nRequested time: ${whenLabel}`,
  }).catch(() => null);

  return NextResponse.json({ ok: true, message: 'Demo request received.' });
}

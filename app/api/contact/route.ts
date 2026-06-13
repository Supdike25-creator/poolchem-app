import { NextRequest, NextResponse } from 'next/server';
import { buildChemDeckEmailHtml, sendResendEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

const CONTACT_EMAIL = 'ChemdeckCo@gmail.com';
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export async function POST(request: NextRequest) {
  let body: {
    name?: string;
    email?: string;
    company?: string;
    message?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: 'Invalid request body.' }, { status: 400 });
  }

  const name = body.name?.trim() ?? '';
  const email = body.email?.trim().toLowerCase() ?? '';
  const company = body.company?.trim() ?? '';
  const message = body.message?.trim() ?? '';

  if (!name) {
    return NextResponse.json({ ok: false, message: 'Name is required.' }, { status: 400 });
  }

  if (!emailPattern.test(email)) {
    return NextResponse.json({ ok: false, message: 'A valid email address is required.' }, { status: 400 });
  }

  if (!company) {
    return NextResponse.json({ ok: false, message: 'Company or facility name is required.' }, { status: 400 });
  }

  if (message.length < 10) {
    return NextResponse.json({ ok: false, message: 'Please include a short message about your operation.' }, { status: 400 });
  }

  if (name.length > 120 || company.length > 160 || message.length > 4000) {
    return NextResponse.json({ ok: false, message: 'One or more fields are too long.' }, { status: 400 });
  }

  const subject = `ChemDeck early access request from ${name}`;
  const text = [
    'New ChemDeck early access request',
    '',
    `Name: ${name}`,
    `Email: ${email}`,
    `Company / facility: ${company}`,
    '',
    'Message:',
    message,
  ].join('\n');

  const html = buildChemDeckEmailHtml({
    eyebrow: 'Early access',
    title: 'New contact request',
    bodyHtml: `
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">
        Someone submitted the early access form on the ChemDeck homepage.
      </p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:14px;line-height:1.6;color:#334155;">
        <tr><td style="padding:6px 0;font-weight:700;width:140px;vertical-align:top;">Name</td><td style="padding:6px 0;">${escapeHtml(name)}</td></tr>
        <tr><td style="padding:6px 0;font-weight:700;vertical-align:top;">Email</td><td style="padding:6px 0;"><a href="mailto:${escapeHtml(email)}" style="color:#2563eb;">${escapeHtml(email)}</a></td></tr>
        <tr><td style="padding:6px 0;font-weight:700;vertical-align:top;">Company</td><td style="padding:6px 0;">${escapeHtml(company)}</td></tr>
      </table>
      <p style="margin:20px 0 8px;font-size:14px;font-weight:700;color:#0f172a;">Message</p>
      <p style="margin:0;font-size:14px;line-height:1.7;color:#334155;white-space:pre-wrap;">${escapeHtml(message)}</p>
    `,
    footer: `Reply directly to ${email} to follow up.`,
  });

  const result = await sendResendEmail({
    to: CONTACT_EMAIL,
    subject,
    html,
    text,
    replyTo: email,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, message: result.message }, { status: 503 });
  }

  return NextResponse.json({
    ok: true,
    message: 'Thanks — your early access request was sent. We will be in touch soon.',
  });
}

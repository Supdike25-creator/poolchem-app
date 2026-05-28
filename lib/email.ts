export type SendEmailResult =
  | { ok: true; message: string; id?: string }
  | { ok: false; message: string; resend_test_mode?: boolean };

export const isResendTestModeError = (message: string) => {
  const lower = message.toLowerCase();
  return lower.includes('testing emails') || lower.includes('verify a domain') || lower.includes('only send');
};

export const formatResendInviteError = (message: string, inviteEmail: string) => {
  if (isResendTestModeError(message)) {
    return `Resend test mode: email can only go to your Resend account address until you verify a domain at resend.com/domains. Use "Copy invite link" for ${inviteEmail} instead.`;
  }
  return message;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export const buildChemDeckEmailHtml = ({
  eyebrow,
  title,
  bodyHtml,
  actionLabel,
  actionUrl,
  footer,
}: {
  eyebrow: string;
  title: string;
  bodyHtml: string;
  actionLabel?: string;
  actionUrl?: string;
  footer?: string;
}) => `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:28px 28px 12px;background:#0A1A2F;color:#ffffff;">
                <p style="margin:0;font-size:13px;letter-spacing:0.12em;text-transform:uppercase;color:#7dd3fc;">${escapeHtml(eyebrow)}</p>
                <h1 style="margin:12px 0 0;font-size:24px;line-height:1.2;font-weight:700;">${escapeHtml(title)}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                ${bodyHtml}
                ${
                  actionLabel && actionUrl
                    ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0 0;">
                  <tr>
                    <td>
                      <a href="${actionUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 22px;border-radius:10px;">${escapeHtml(actionLabel)}</a>
                    </td>
                  </tr>
                </table>`
                    : ''
                }
                ${footer ? `<p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:#64748b;">${footer}</p>` : ''}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

export async function sendResendEmail(params: {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
}): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.INVITE_EMAIL_FROM?.trim() || 'ChemDeck <onboarding@resend.dev>';
  const recipients = (Array.isArray(params.to) ? params.to : [params.to])
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  if (!recipients.length) {
    return { ok: false, message: 'No recipient email addresses.' };
  }

  if (!apiKey) {
    return {
      ok: false,
      message: 'Email sending is not configured. Add RESEND_API_KEY to your environment.',
    };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: recipients,
      subject: params.subject,
      html: params.html,
      text: params.text,
    }),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    const detail = typeof result?.message === 'string' ? result.message : 'Unable to send email.';
    const primaryRecipient = recipients[0];
    return {
      ok: false,
      message: formatResendInviteError(detail, primaryRecipient),
      resend_test_mode: isResendTestModeError(detail),
    };
  }

  return {
    ok: true,
    message: `Email sent to ${recipients.join(', ')}.`,
    id: result.id as string | undefined,
  };
}

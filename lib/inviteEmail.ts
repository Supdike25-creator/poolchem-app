import type { SupabaseClient } from '@supabase/supabase-js';
import { buildInviteUrl } from '@/lib/companyInvites';
import { sendResendEmail } from '@/lib/email';

export { formatResendInviteError, isResendTestModeError } from '@/lib/email';

type SendInviteEmailParams = {
  to: string;
  companyName: string;
  inviterName?: string;
  token: string;
  origin: string;
  hasAccount: boolean;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export const buildInviteEmailContent = ({
  to,
  companyName,
  inviterName,
  token,
  origin,
  hasAccount,
}: SendInviteEmailParams) => {
  const signupLink = buildInviteUrl(token, origin);
  const loginLink = `${signupLink}?mode=login`;
  const safeCompany = escapeHtml(companyName);
  const safeEmail = escapeHtml(to);
  const greeting = inviterName
    ? `${escapeHtml(inviterName)} invited you to join ${safeCompany} on ChemDeck.`
    : `You have been invited to join ${safeCompany} on ChemDeck.`;

  const subject = `You've been invited to join ${companyName} on ChemDeck`;

  const html = `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:28px 28px 12px;background:#0A1A2F;color:#ffffff;">
                <p style="margin:0;font-size:13px;letter-spacing:0.12em;text-transform:uppercase;color:#7dd3fc;">ChemDeck</p>
                <h1 style="margin:12px 0 0;font-size:28px;line-height:1.2;font-weight:700;">Hello,</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">${greeting}</p>
                <p style="margin:0 0 24px;font-size:16px;line-height:1.6;">Open the link below to ${hasAccount ? 'sign in and join your team' : 'create your account and join your team'}. You&apos;ll be added to <strong>${safeCompany}</strong> automatically.</p>
                <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 16px;">
                  <tr>
                    <td style="padding-right:12px;padding-bottom:12px;">
                      <a href="${signupLink}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 22px;border-radius:10px;">Create account</a>
                    </td>
                    <td style="padding-bottom:12px;">
                      <a href="${loginLink}" style="display:inline-block;background:#ffffff;color:#2563eb;text-decoration:none;font-size:15px;font-weight:700;padding:13px 22px;border-radius:10px;border:1px solid #bfdbfe;">Sign in</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:#64748b;">This invite was sent to <strong>${safeEmail}</strong>.</p>
                <p style="margin:0;font-size:13px;line-height:1.5;color:#64748b;">If the buttons don&apos;t work, copy this link:<br><a href="${signupLink}" style="color:#2563eb;word-break:break-all;">${signupLink}</a></p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    'Hello,',
    '',
    inviterName
      ? `${inviterName} invited you to join ${companyName} on ChemDeck.`
      : `You have been invited to join ${companyName} on ChemDeck.`,
    '',
    `Create account: ${signupLink}`,
    `Sign in: ${loginLink}`,
    '',
    `This invite was sent to ${to}.`,
  ].join('\n');

  return { subject, html, text, signupLink, loginLink };
};

export async function sendInviteEmail(params: SendInviteEmailParams) {
  const content = buildInviteEmailContent(params);
  const to = params.to.trim().toLowerCase();
  const result = await sendResendEmail({
    to,
    subject: content.subject,
    html: content.html,
    text: content.text,
  });

  if (!result.ok) {
    return {
      ok: false as const,
      message: result.message,
      resend_test_mode: result.resend_test_mode ?? false,
      ...content,
    };
  }

  return {
    ok: true as const,
    message: `Invite email sent to ${to}.`,
    id: result.id,
    ...content,
  };
}

export async function inviteEmailHasAccount(db: SupabaseClient, email: string) {
  const normalized = email.trim().toLowerCase();

  const [{ data: userRow }, { data: profileRow }] = await Promise.all([
    db.from('users').select('id').eq('email', normalized).maybeSingle(),
    db.from('profiles').select('id').eq('email', normalized).maybeSingle(),
  ]);

  if (userRow?.id || profileRow?.id) {
    return true;
  }

  const { data, error } = await db.rpc('auth_user_exists_by_email', { p_email: normalized });
  if (!error && typeof data === 'boolean') {
    return data;
  }

  return false;
}

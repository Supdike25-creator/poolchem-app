import { buildChemDeckEmailHtml } from '@/lib/email';
import { buildInviteEmailContent, inviteEmailHasAccount } from '@/lib/inviteEmail';
import { getAppBaseUrl } from '@/lib/inviteLinks';
import { buildInviteUrl, createCompanyInvite, isInviteEmailValid, listPendingInvites } from '@/lib/companyInvites';
import { mergeCompanySettings } from '@/lib/companySettings';
import { buildDevHotbarItems, perspectiveHomePath } from '@/lib/devPerspective';
import {
  buildGuardNavItems,
  buildManagerNavItems,
  toNavRouteLinks,
} from '@/lib/sidebarNavItems';
import type { SupabaseClient } from '@supabase/supabase-js';

export type DevTestLabLink = {
  label: string;
  url: string;
  description?: string;
};

export type DevTestLabEmailPreview = {
  kind: 'invite_unlinked' | 'invite_linked' | 'alert' | 'announcement' | 'daily_summary';
  subject: string;
  html: string;
  text: string;
  links: DevTestLabLink[];
  scenario?: {
    recipient_email: string;
    has_account: boolean;
    links_live: boolean;
  };
};

export type DevTestLabConfig = {
  app_url: string;
  invite_email_from: string;
  resend_api_key: string;
  supabase_url: string;
  service_role_configured: boolean;
  resend_configured: boolean;
};

export type DevTestLabInviteRow = {
  id: string;
  email: string;
  token: string;
  expires_at: string;
  invite_link: string;
  sign_in_link: string;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export function readDevTestLabConfig(origin: string): DevTestLabConfig {
  const apiKey = process.env.RESEND_API_KEY?.trim() ?? '';
  return {
    app_url: getAppBaseUrl(origin),
    invite_email_from: process.env.INVITE_EMAIL_FROM?.trim() || 'ChemDeck <onboarding@resend.dev>',
    resend_api_key: apiKey ? `set (${apiKey.slice(0, 6)}…)` : 'missing',
    supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || 'missing',
    service_role_configured: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()),
    resend_configured: Boolean(apiKey),
  };
}

export const DEV_LAB_UNLINKED_EMAIL = 'dev.lab.unlinked@chemdeck.app';

export function buildEmailPreviews(input: {
  origin: string;
  companyName: string;
  unlinkedToken?: string;
  linkedToken?: string;
  linkedEmail?: string;
  linkedHasAccount?: boolean;
}): DevTestLabEmailPreview[] {
  const origin = getAppBaseUrl(input.origin);
  const unlinkedEmail = DEV_LAB_UNLINKED_EMAIL;
  const linkedEmail = input.linkedEmail?.trim().toLowerCase() || 'existing.employee@example.com';
  const linkedHasAccount = input.linkedHasAccount ?? true;
  const unlinkedToken = input.unlinkedToken ?? '';
  const linkedToken = input.linkedToken ?? '';

  const inviteUnlinked = buildInviteEmailContent({
    to: unlinkedEmail,
    companyName: input.companyName,
    inviterName: 'Test Manager',
    token: unlinkedToken || 'preview-unlinked',
    origin,
    hasAccount: false,
  });

  const inviteLinked = buildInviteEmailContent({
    to: linkedEmail,
    companyName: input.companyName,
    inviterName: 'Test Manager',
    token: linkedToken || 'preview-linked',
    origin,
    hasAccount: linkedHasAccount,
  });

  const inviteLinks = (invite: ReturnType<typeof buildInviteEmailContent>) => [
    { label: 'Create account (email button)', url: invite.signupLink, description: 'Primary invite CTA' },
    { label: 'Sign in (email button)', url: invite.loginLink, description: 'Existing user CTA' },
    { label: 'Invite page', url: invite.signupLink },
  ];

  const scenarioMeta = (recipientEmail: string, hasAccount: boolean, token: string) => ({
    recipient_email: recipientEmail,
    has_account: hasAccount,
    links_live: Boolean(token),
  });

  const alertHtml = buildChemDeckEmailHtml({
    eyebrow: input.companyName,
    title: 'Test pool alert',
    bodyHtml:
      '<p style="margin:0 0 16px;font-size:16px;line-height:1.6;">This is a test notification from the ChemDeck Dev Test Lab. Managers receive emails when alerts fire.</p>',
    actionLabel: 'Open alerts',
    actionUrl: `${origin}/management/alerts`,
    footer: 'You are receiving this because alert notifications are enabled in ChemDeck settings.',
  });

  const announcementHtml = buildChemDeckEmailHtml({
    eyebrow: input.companyName,
    title: 'Pool closed for maintenance',
    bodyHtml: `<p style="margin:0;font-size:16px;line-height:1.7;">Main pool is closed until 2 PM for chemical balance adjustment.</p>`,
    actionLabel: 'View announcement',
    actionUrl: `${origin}/employee/announcements`,
    footer: 'You are receiving this because announcement notifications are enabled in ChemDeck settings.',
  });

  const dailyHtml = buildChemDeckEmailHtml({
    eyebrow: input.companyName,
    title: 'Daily operations summary',
    bodyHtml:
      '<ul style="margin:0;padding-left:20px;font-size:15px;line-height:1.6;color:#334155;"><li>3 alerts created (1 critical)</li><li>12 chemistry logs submitted</li><li>1 announcement posted</li></ul>',
    actionLabel: 'Open dashboard',
    actionUrl: `${origin}/management/dashboard`,
    footer: 'Daily summary from ChemDeck.',
  });

  return [
    {
      kind: 'invite_unlinked',
      subject: inviteUnlinked.subject,
      html: inviteUnlinked.html,
      text: inviteUnlinked.text,
      links: inviteLinks(inviteUnlinked),
      scenario: scenarioMeta(unlinkedEmail, false, unlinkedToken),
    },
    {
      kind: 'invite_linked',
      subject: inviteLinked.subject,
      html: inviteLinked.html,
      text: inviteLinked.text,
      links: inviteLinks(inviteLinked),
      scenario: scenarioMeta(linkedEmail, linkedHasAccount, linkedToken),
    },
    {
      kind: 'alert',
      subject: `[ChemDeck] Test pool alert for ${input.companyName}`,
      html: alertHtml,
      text: `Test alert for ${input.companyName}\n\nOpen alerts: ${origin}/management/alerts`,
      links: [{ label: 'Open alerts', url: `${origin}/management/alerts` }],
    },
    {
      kind: 'announcement',
      subject: `[ChemDeck] Pool closed for maintenance`,
      html: announcementHtml,
      text: `Announcement\n\nView: ${origin}/employee/announcements`,
      links: [{ label: 'View announcement', url: `${origin}/employee/announcements` }],
    },
    {
      kind: 'daily_summary',
      subject: `[ChemDeck] Daily summary for ${input.companyName}`,
      html: dailyHtml,
      text: `Daily summary for ${input.companyName}`,
      links: [{ label: 'Open dashboard', url: `${origin}/management/dashboard` }],
    },
  ];
}

export function buildRouteGroups(companyId?: string | null) {
  const query = companyId ? `?companyId=${encodeURIComponent(companyId)}` : '';
  const app = (path: string) => `${path}${query}`;

  return {
    onboarding: [
      { label: 'Create manager account', url: '/create-account', description: 'Public manager signup' },
      { label: 'Sign in', url: '/login', description: 'Existing users' },
      { label: 'Create company', url: '/create-company', description: 'After manager signup' },
      { label: 'Invite required (employee)', url: '/choose-role', description: 'Guard without invite' },
    ] satisfies DevTestLabLink[],
    dev: toNavRouteLinks(buildDevHotbarItems(companyId), 'Dev console'),
    manager: toNavRouteLinks(buildManagerNavItems(companyId), 'Manager POV'),
    employee: toNavRouteLinks(buildGuardNavItems(companyId), 'Employee POV'),
    pov_homes: [
      { label: 'Dev home', url: perspectiveHomePath('dev', companyId), description: 'D perspective' },
      { label: 'Manager home', url: perspectiveHomePath('manager', companyId), description: 'M perspective' },
      { label: 'Employee home', url: perspectiveHomePath('employee', companyId), description: 'E perspective' },
    ] satisfies DevTestLabLink[],
    auth_preview: [
      { label: 'Manager settings', url: app('/management/settings') },
      { label: 'Team invites', url: app('/management/team') },
      { label: 'Submit log', url: app('/employee/log') },
    ] satisfies DevTestLabLink[],
  };
}

export async function loadPendingInviteRows(
  db: SupabaseClient,
  companyId: string,
  origin: string,
): Promise<DevTestLabInviteRow[]> {
  const invites = await listPendingInvites(db, companyId);
  return invites.map((invite) => {
    const base = buildInviteUrl(invite.token, origin);
    return {
      id: invite.id,
      email: invite.email,
      token: invite.token,
      expires_at: invite.expires_at,
      invite_link: base,
      sign_in_link: `${base}?mode=login`,
    };
  });
}

export async function checkTableHealth(db: SupabaseClient) {
  const tables = ['company_invites', 'companies', 'users', 'profiles', 'pools', 'chemical_logs', 'alerts'];
  const results: Record<string, 'ok' | 'missing' | 'error'> = {};

  for (const table of tables) {
    const { error } = await db.from(table).select('*', { head: true, count: 'exact' }).limit(1);
    if (!error) {
      results[table] = 'ok';
    } else if (error.message.toLowerCase().includes('does not exist')) {
      results[table] = 'missing';
    } else {
      results[table] = 'error';
    }
  }

  return results;
}

export async function loadCompanyName(db: SupabaseClient, companyId: string) {
  const { data } = await db.from('companies').select('company_name').eq('id', companyId).maybeSingle();
  return data?.company_name?.trim() || 'Test Company';
}

export async function ensureDevLabInvites(
  db: SupabaseClient,
  companyId: string,
  linkedEmail: string,
) {
  const normalizedLinked = linkedEmail.trim().toLowerCase();
  const { token: unlinkedToken } = await createCompanyInvite(db, {
    companyId,
    email: DEV_LAB_UNLINKED_EMAIL,
    createdBy: null,
  });

  if (!isInviteEmailValid(normalizedLinked)) {
    return { unlinkedToken, linkedToken: '', linkedEmail: normalizedLinked };
  }

  const { token: linkedToken } = await createCompanyInvite(db, {
    companyId,
    email: normalizedLinked,
    createdBy: null,
  });

  return { unlinkedToken, linkedToken, linkedEmail: normalizedLinked };
}

export async function resolveLinkedInviteScenario(
  db: SupabaseClient,
  linkedEmail: string,
) {
  const normalized = linkedEmail.trim().toLowerCase();
  const hasAccount = normalized ? await inviteEmailHasAccount(db, normalized) : false;
  return { linkedEmail: normalized || 'existing.employee@example.com', hasAccount };
}

export async function loadCompanySettings(db: SupabaseClient, companyId: string) {
  const { data } = await db.from('companies').select('settings').eq('id', companyId).maybeSingle();
  return mergeCompanySettings(data?.settings);
}

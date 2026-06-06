import { buildChemDeckEmailHtml } from '@/lib/email';
import { buildInviteEmailContent } from '@/lib/inviteEmail';
import { getAppBaseUrl } from '@/lib/inviteLinks';
import { buildInviteUrl, generateInviteToken, listPendingInvites } from '@/lib/companyInvites';
import { mergeCompanySettings } from '@/lib/companySettings';
import { buildDevHotbarItems, perspectiveHomePath } from '@/lib/devPerspective';
import { buildGuardNavItems, buildManagerNavItems } from '@/components/SidebarNav';
import type { SupabaseClient } from '@supabase/supabase-js';

export type DevTestLabLink = {
  label: string;
  url: string;
  description?: string;
};

export type DevTestLabEmailPreview = {
  kind: 'invite' | 'alert' | 'announcement' | 'daily_summary';
  subject: string;
  html: string;
  text: string;
  links: DevTestLabLink[];
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

export function buildEmailPreviews(input: {
  origin: string;
  companyName: string;
  sampleToken?: string;
}): DevTestLabEmailPreview[] {
  const token = input.sampleToken ?? generateInviteToken();
  const origin = getAppBaseUrl(input.origin);
  const invite = buildInviteEmailContent({
    to: 'lifeguard@example.com',
    companyName: input.companyName,
    inviterName: 'Test Manager',
    token,
    origin,
    hasAccount: false,
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
    actionUrl: `${origin}/guard/announcements`,
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
      kind: 'invite',
      subject: invite.subject,
      html: invite.html,
      text: invite.text,
      links: [
        { label: 'Create account (email button)', url: invite.signupLink, description: 'Primary invite CTA' },
        { label: 'Sign in (email button)', url: invite.loginLink, description: 'Existing user CTA' },
        { label: 'Invite page', url: invite.signupLink },
      ],
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
      text: `Announcement\n\nView: ${origin}/guard/announcements`,
      links: [{ label: 'View announcement', url: `${origin}/guard/announcements` }],
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
      { label: 'Invite required (lifeguard)', url: '/choose-role', description: 'Guard without invite' },
    ] satisfies DevTestLabLink[],
    dev: buildDevHotbarItems(companyId).map((item) => ({
      label: item.label,
      url: item.href,
      description: 'Dev console',
    })),
    manager: buildManagerNavItems(companyId).map((item) => ({
      label: item.label,
      url: item.href,
      description: 'Manager POV',
    })),
    lifeguard: buildGuardNavItems(companyId).map((item) => ({
      label: item.label,
      url: item.href,
      description: 'Lifeguard POV',
    })),
    pov_homes: [
      { label: 'Dev home', url: perspectiveHomePath('dev', companyId), description: 'D perspective' },
      { label: 'Manager home', url: perspectiveHomePath('manager', companyId), description: 'M perspective' },
      { label: 'Lifeguard home', url: perspectiveHomePath('lifeguard', companyId), description: 'L perspective' },
    ] satisfies DevTestLabLink[],
    auth_preview: [
      { label: 'Manager settings', url: app('/management/settings') },
      { label: 'Team invites', url: app('/management/team') },
      { label: 'Submit log', url: app('/guard/log') },
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

export async function loadCompanySettings(db: SupabaseClient, companyId: string) {
  const { data } = await db.from('companies').select('settings').eq('id', companyId).maybeSingle();
  return mergeCompanySettings(data?.settings);
}

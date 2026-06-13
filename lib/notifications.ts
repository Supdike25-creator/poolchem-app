import type { SupabaseClient } from '@supabase/supabase-js';
import type { CompanySettings } from '@/lib/companySettings';
import { mergeCompanySettings } from '@/lib/companySettings';
import { buildChemDeckEmailHtml, sendResendEmail } from '@/lib/email';
import { getAppBaseUrl } from '@/lib/inviteLinks';
import { isGuardRole } from '@/lib/guardPools';
import { loadCompanyTeamMembers } from '@/lib/teamMembers';

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const managerRoles = new Set(['admin', 'manager', 'owner', 'boss', 'supervisor']);

export type AlertNotificationRow = {
  id: string;
  alert_type: string;
  title: string;
  message: string;
  severity?: string | null;
};

export type AnnouncementNotificationInput = {
  id: string;
  title: string;
  message: string;
  priority?: string | null;
  audience?: string | null;
  pool_id?: string | null;
  send_notification?: boolean | null;
};

const parseTime = (value: string) => {
  const [hours, minutes] = value.split(':').map((part) => Number.parseInt(part, 10));
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
};

export const isQuietHours = (settings: CompanySettings, now = new Date()) => {
  const start = parseTime(settings.quietHoursStart);
  const end = parseTime(settings.quietHoursEnd);
  if (start === null || end === null) return false;

  const current = now.getHours() * 60 + now.getMinutes();
  if (start === end) return false;
  if (start < end) return current >= start && current < end;
  return current >= start || current < end;
};

const isActiveMember = (status?: string | null) =>
  String(status ?? 'active').toLowerCase() !== 'inactive';

const uniqueEmails = (emails: Array<string | null | undefined>) =>
  Array.from(
    new Set(
      emails
        .map((email) => email?.trim().toLowerCase())
        .filter((email): email is string => Boolean(email && email.includes('@'))),
    ),
  );

async function loadManagerAccountEmails(db: SupabaseClient, companyId: string) {
  const { data } = await db
    .from('app_accounts')
    .select('email, role')
    .eq('company_id', companyId);

  return uniqueEmails(
    (data ?? [])
      .filter((row) => managerRoles.has(String(row.role ?? '').toLowerCase()))
      .map((row) => row.email),
  );
}

async function loadGuardAccountEmails(db: SupabaseClient, companyId: string) {
  const { data } = await db
    .from('app_accounts')
    .select('email, role')
    .eq('company_id', companyId);

  return uniqueEmails(
    (data ?? [])
      .filter((row) => isGuardRole(row.role))
      .map((row) => row.email),
  );
}

async function loadManagerEmails(db: SupabaseClient, companyId: string) {
  const members = await loadCompanyTeamMembers(db, companyId);
  const fromMembers = members
    .filter((member) => isActiveMember(member.status) && managerRoles.has(String(member.role ?? '').toLowerCase()))
    .map((member) => member.email);

  const extra = await loadManagerAccountEmails(db, companyId);
  return uniqueEmails([...fromMembers, ...extra]);
}

async function loadGuardEmails(db: SupabaseClient, companyId: string, poolId?: string | null) {
  const members = await loadCompanyTeamMembers(db, companyId);
  let guards = members.filter(
    (member) => isActiveMember(member.status) && isGuardRole(member.role),
  );

  if (poolId) {
    const { data: assignments } = await db
      .from('guard_pool_assignments')
      .select('guard_id')
      .eq('company_id', companyId)
      .eq('pool_id', poolId);

    const assignedIds = new Set((assignments ?? []).map((row) => row.guard_id));
    if (assignedIds.size > 0) {
      guards = guards.filter((guard) => assignedIds.has(guard.id));
    }
  }

  const extra = await loadGuardAccountEmails(db, companyId);
  return uniqueEmails([...guards.map((guard) => guard.email), ...extra]);
}

async function loadAnnouncementRecipients(
  db: SupabaseClient,
  companyId: string,
  audience?: string | null,
  poolId?: string | null,
) {
  const normalizedAudience = String(audience ?? 'all_employees').toLowerCase();

  if (normalizedAudience === 'managers_only') {
    return loadManagerEmails(db, companyId);
  }

  if (normalizedAudience === 'specific_pool') {
    return loadGuardEmails(db, companyId, poolId);
  }

  return loadGuardEmails(db, companyId);
}

const shouldNotifyAlert = (settings: CompanySettings, alertType: string, severity?: string | null) => {
  if (!settings.masterNotifications) return false;
  if (isQuietHours(settings) && severity !== 'critical') return false;

  switch (alertType) {
    case 'out_of_range':
      return settings.outOfRangeAlerts;
    case 'missed_test':
      return settings.missedTestAlerts;
    case 'missing_photo':
      return settings.outOfRangeAlerts || settings.masterNotifications;
    default:
      return settings.masterNotifications;
  }
};

async function loadCompanyName(db: SupabaseClient, companyId: string) {
  const { data } = await db.from('companies').select('company_name, settings').eq('id', companyId).maybeSingle();
  return {
    companyName: data?.company_name?.trim() || 'ChemDeck',
    settings: mergeCompanySettings(data?.settings),
  };
}

const managementUrl = (origin: string) => `${getAppBaseUrl(origin)}/management/alerts`;
const announcementsUrl = (origin: string) => `${getAppBaseUrl(origin)}/employee/announcements`;

export async function dispatchAlertNotifications(
  db: SupabaseClient,
  input: {
    companyId: string;
    alerts: AlertNotificationRow[];
    settings?: CompanySettings;
    origin?: string;
  },
) {
  if (!input.alerts.length) return { sent: 0, skipped: 0, failures: [] as string[] };

  const loaded = await loadCompanyName(db, input.companyId);
  const settingsResolved = input.settings ?? loaded.settings;
  const companyName = loaded.companyName;
  const actionableAlerts = input.alerts.filter((alert) =>
    shouldNotifyAlert(settingsResolved, alert.alert_type, alert.severity),
  );

  if (!actionableAlerts.length) {
    return { sent: 0, skipped: input.alerts.length, failures: [] as string[] };
  }

  const recipients = await loadManagerEmails(db, input.companyId);
  if (!recipients.length) {
    return {
      sent: 0,
      skipped: input.alerts.length,
      failures: ['No manager email addresses on file for this company.'],
    };
  }

  const origin = getAppBaseUrl(input.origin ?? '');
  const alertLines = actionableAlerts
    .map((alert) => `<li style="margin:0 0 12px;"><strong>${escapeHtml(alert.title)}</strong><br>${escapeHtml(alert.message)}</li>`)
    .join('');
  const textLines = actionableAlerts.map((alert) => `- ${alert.title}: ${alert.message}`).join('\n');
  const subject =
    actionableAlerts.length === 1
      ? `[ChemDeck] ${actionableAlerts[0].title}`
      : `[ChemDeck] ${actionableAlerts.length} pool alerts for ${companyName}`;

  const html = buildChemDeckEmailHtml({
    eyebrow: companyName,
    title: actionableAlerts.length === 1 ? actionableAlerts[0].title : 'Pool alerts need attention',
    bodyHtml: `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;">${actionableAlerts.length === 1 ? actionableAlerts[0].message : 'Review the following operational alerts:'}</p><ul style="margin:0;padding-left:20px;font-size:15px;line-height:1.6;color:#334155;">${alertLines}</ul>`,
    actionLabel: 'Open alerts',
    actionUrl: managementUrl(origin),
    footer: 'You are receiving this because manager notifications are enabled in ChemDeck settings.',
  });

  const result = await sendResendEmail({
    to: recipients,
    subject,
    html,
    text: [`${companyName} alerts`, '', textLines, '', `Open alerts: ${managementUrl(origin)}`].join('\n'),
  });

  return {
    sent: result.ok ? recipients.length : 0,
    skipped: input.alerts.length - actionableAlerts.length,
    failures: result.ok ? [] : [result.message],
    resend_test_mode: !result.ok && result.resend_test_mode,
  };
}

export async function dispatchAnnouncementNotifications(
  db: SupabaseClient,
  input: {
    companyId: string;
    announcement: AnnouncementNotificationInput;
    settings?: CompanySettings;
    origin?: string;
  },
) {
  if (!input.announcement.send_notification) {
    return { sent: 0, skipped: 1, failures: [] as string[] };
  }

  const loaded = await loadCompanyName(db, input.companyId);
  const settings = input.settings ?? loaded.settings;
  const companyName = loaded.companyName;

  if (!settings.masterNotifications || !settings.newAnnouncementAlerts) {
    return { sent: 0, skipped: 1, failures: [] as string[] };
  }

  if (isQuietHours(settings) && String(input.announcement.priority ?? '').toLowerCase() !== 'emergency') {
    return { sent: 0, skipped: 1, failures: ['Skipped during quiet hours.'] };
  }

  const recipients = await loadAnnouncementRecipients(
    db,
    input.companyId,
    input.announcement.audience,
    input.announcement.pool_id,
  );

  if (!recipients.length) {
    return {
      sent: 0,
      skipped: 0,
      failures: ['No staff email addresses on file for this announcement audience.'],
    };
  }

  const origin = getAppBaseUrl(input.origin ?? '');
  const priority = String(input.announcement.priority ?? 'normal');
  const subjectPrefix = priority === 'emergency' ? '[URGENT] ' : priority === 'important' ? '[Important] ' : '';
  const subject = `${subjectPrefix}[ChemDeck] ${input.announcement.title}`;

  const html = buildChemDeckEmailHtml({
    eyebrow: companyName,
    title: input.announcement.title,
    bodyHtml: `<p style="margin:0;font-size:16px;line-height:1.7;white-space:pre-wrap;">${escapeHtml(input.announcement.message).replace(/\n/g, '<br>')}</p>`,
    actionLabel: 'View announcement',
    actionUrl: announcementsUrl(origin),
    footer: 'You are receiving this because announcement notifications are enabled in ChemDeck settings.',
  });

  const result = await sendResendEmail({
    to: recipients,
    subject,
    html,
    text: [
      `${companyName} announcement`,
      '',
      input.announcement.title,
      input.announcement.message,
      '',
      `View: ${announcementsUrl(origin)}`,
    ].join('\n'),
  });

  return {
    sent: result.ok ? recipients.length : 0,
    skipped: 0,
    failures: result.ok ? [] : [result.message],
    resend_test_mode: !result.ok && result.resend_test_mode,
  };
}

export async function dispatchDailySummaryNotifications(
  db: SupabaseClient,
  input: { companyId: string; origin?: string },
) {
  const { companyName, settings } = await loadCompanyName(db, input.companyId);
  if (!settings.masterNotifications || !settings.dailySummary) {
    return { sent: 0, skipped: 1, failures: [] as string[] };
  }

  const recipients = await loadManagerEmails(db, input.companyId);
  if (!recipients.length) {
    return { sent: 0, skipped: 0, failures: ['No manager email addresses on file.'] };
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: pools } = await db.from('pools').select('id').eq('company_id', input.companyId);
  const poolIds = (pools ?? []).map((pool) => pool.id);

  const [{ data: alerts }, { data: logs }, { data: announcements }] = await Promise.all([
    db
      .from('alerts')
      .select('title, alert_type, severity, created_at')
      .eq('company_id', input.companyId)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(20),
    poolIds.length
      ? db
          .from('chemical_logs')
          .select('id, created_at')
          .in('pool_id', poolIds)
          .gte('created_at', since)
          .limit(100)
      : Promise.resolve({ data: [] }),
    db
      .from('announcements')
      .select('title, created_at')
      .eq('company_id', input.companyId)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  const logCount = logs?.length ?? 0;
  const alertCount = alerts?.length ?? 0;
  const announcementCount = announcements?.length ?? 0;
  const unresolvedAlerts = (alerts ?? []).filter((alert) => alert.severity === 'critical').length;

  const origin = getAppBaseUrl(input.origin ?? '');
  const subject = `[ChemDeck] Daily summary for ${companyName}`;
  const summaryLines = [
    `${logCount} chemistry logs submitted`,
    `${alertCount} alerts created (${unresolvedAlerts} critical)`,
    `${announcementCount} announcements posted`,
  ];

  const html = buildChemDeckEmailHtml({
    eyebrow: companyName,
    title: 'Daily operations summary',
    bodyHtml: `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Here is your last 24 hours at ${companyName}:</p><ul style="margin:0;padding-left:20px;font-size:15px;line-height:1.8;color:#334155;">${summaryLines.map((line) => `<li>${line}</li>`).join('')}</ul>`,
    actionLabel: 'Open dashboard',
    actionUrl: `${origin}/management/dashboard`,
    footer: 'Daily summary emails can be turned off in ChemDeck settings.',
  });

  const result = await sendResendEmail({
    to: recipients,
    subject,
    html,
    text: [`Daily summary for ${companyName}`, '', ...summaryLines, '', `Dashboard: ${origin}/management/dashboard`].join('\n'),
  });

  return {
    sent: result.ok ? recipients.length : 0,
    skipped: 0,
    failures: result.ok ? [] : [result.message],
  };
}

import type { SupabaseClient } from '@supabase/supabase-js';
import { buildInviteEmailContent, sendInviteEmail } from '@/lib/inviteEmail';
import { getAppBaseUrl } from '@/lib/inviteLinks';
import {
  createCompanyInvite,
  getInviteByToken,
  isInviteEmailValid,
  previewInvite,
} from '@/lib/companyInvites';
import { loadDevCompanySummary } from '@/lib/devCompanySummary';
import { mergeCompanySettings } from '@/lib/companySettings';
import { dispatchAlertNotifications } from '@/lib/notifications';
import {
  checkTableHealth,
  loadCompanyName,
  readDevTestLabConfig,
} from '@/lib/devTestLab';

export type WizardStepKind = 'auto' | 'manual' | 'optional';

export type WizardStepDefinition = {
  id: string;
  phase: 'setup' | 'team' | 'operations' | 'go-live';
  phaseLabel: string;
  title: string;
  description: string;
  kind: WizardStepKind;
  playbookNote: string;
};

export type WizardStepResult = {
  id: string;
  ok: boolean;
  status: 'passed' | 'failed' | 'skipped' | 'manual';
  message: string;
  details?: unknown;
  link?: string;
};

export const onboardingWizardSteps: WizardStepDefinition[] = [
  {
    id: 'config',
    phase: 'setup',
    phaseLabel: '1 · Workspace setup',
    title: 'Email & database config',
    description: 'Service role, Resend, app URL, and core tables are ready for live tests.',
    kind: 'auto',
    playbookNote: 'ChemDeck checks server env and database tables before any invite or email test runs.',
  },
  {
    id: 'company',
    phase: 'setup',
    phaseLabel: '1 · Workspace setup',
    title: 'Company workspace selected',
    description: 'A test company is scoped so invites and routes target the right tenant.',
    kind: 'auto',
    playbookNote: 'Every invite and route test should target one company so results stay isolated.',
  },
  {
    id: 'pool',
    phase: 'setup',
    phaseLabel: '1 · Workspace setup',
    title: 'At least one pool exists',
    description: 'Employees need a pool to log chemistry readings after they join.',
    kind: 'auto',
    playbookNote: 'Like defining job sites or positions before scheduling — pools are ChemDeck’s unit of work.',
  },
  {
    id: 'manager-routes',
    phase: 'setup',
    phaseLabel: '1 · Workspace setup',
    title: 'Manager team page reachable',
    description: 'The manager invite UI loads (where production managers send team invites).',
    kind: 'auto',
    playbookNote: 'In production, managers send invites from Team — the wizard only simulates that path.',
  },
  {
    id: 'create-invite',
    phase: 'team',
    phaseLabel: '2 · Invite your team',
    title: 'Create employee invite',
    description: 'Generates a pending invite row and signup link for your test recipient.',
    kind: 'auto',
    playbookNote: 'ChemDeck uses tokenized /invite URLs; email delivery is tested separately.',
  },
  {
    id: 'validate-invite',
    phase: 'team',
    phaseLabel: '2 · Invite your team',
    title: 'Validate invite API',
    description: 'Confirms the invite exists in Supabase and /api/invites returns OK.',
    kind: 'auto',
    playbookNote: 'Catches broken tokens before a new hire hits a dead link.',
  },
  {
    id: 'probe-invite-page',
    phase: 'team',
    phaseLabel: '2 · Invite your team',
    title: 'Invite landing page loads',
    description: 'HTTP check that the public invite page responds successfully.',
    kind: 'auto',
    playbookNote: 'The public invite page is the first screen new employees see after clicking a link.',
  },
  {
    id: 'manual-join',
    phase: 'team',
    phaseLabel: '2 · Invite your team',
    title: 'Complete join in browser',
    description: 'Open the invite link in incognito, create account or sign in, and land on the employee home.',
    kind: 'manual',
    playbookNote: 'Account creation and sign-in must be completed as a real user in an incognito window.',
  },
  {
    id: 'send-email',
    phase: 'team',
    phaseLabel: '2 · Invite your team',
    title: 'Send live invite email',
    description: 'Optional Resend delivery test using the same template as production invites.',
    kind: 'optional',
    playbookNote: 'Run this on staging or production when verifying Resend and your sending domain.',
  },
  {
    id: 'employee-routes',
    phase: 'operations',
    phaseLabel: '3 · First day on the job',
    title: 'Employee log route reachable',
    description: 'The chemistry log screen loads for the scoped company POV.',
    kind: 'auto',
    playbookNote: 'Like clocking in or completing a first task — logging is ChemDeck’s core employee action.',
  },
  {
    id: 'manual-first-log',
    phase: 'operations',
    phaseLabel: '3 · First day on the job',
    title: 'Submit a test chemistry log',
    description: 'As the new employee, submit one log entry so manager dashboards show real data.',
    kind: 'manual',
    playbookNote: 'A real chemistry log proves the manager → employee → data loop is working end to end.',
  },
  {
    id: 'notification',
    phase: 'go-live',
    phaseLabel: '4 · Stay in the loop',
    title: 'Manager alert notification',
    description: 'Fires a test alert email to managers on this company (if any manager emails exist).',
    kind: 'optional',
    playbookNote: 'ChemDeck emails managers when pool chemistry falls outside configured ranges.',
  },
];

const probeUrl = async (url: string) => {
  const started = Date.now();
  const response = await fetch(url, { redirect: 'follow' });
  return {
    ok: response.ok,
    message: `${response.status} ${response.statusText} (${Date.now() - started}ms)`,
    status: response.status,
    final_url: response.url,
  };
};

async function ensureTestPool(db: SupabaseClient, companyId: string) {
  const summary = await loadDevCompanySummary(companyId);
  if (!summary) {
    return { ok: false, message: 'Company not found.', created: false };
  }
  if (summary.pool_count > 0) {
    return { ok: true, message: `${summary.pool_count} pool(s) already configured.`, created: false };
  }

  const { error } = await db.from('pools').insert({
    name: 'Wizard Test Pool',
    company_id: companyId,
    pool_type: 'Pool',
    volume_gallons: null,
    target_chlorine_min: 1,
    target_chlorine_max: 3,
    target_ph_min: 7.2,
    target_ph_max: 7.8,
    notes: 'Created by Dev Test Lab onboarding wizard.',
  });

  if (error) {
    return { ok: false, message: error.message, created: false };
  }

  return { ok: true, message: 'Added Wizard Test Pool to company.', created: true };
}

export async function runOnboardingWizard(input: {
  db: SupabaseClient;
  companyId: string;
  origin: string;
  testEmail: string;
  sendEmail: boolean;
  sendNotification: boolean;
}) {
  const { db, companyId, origin, testEmail, sendEmail, sendNotification } = input;
  const config = readDevTestLabConfig(origin);
  const companyQuery = `?companyId=${encodeURIComponent(companyId)}`;
  const results: WizardStepResult[] = [];
  let inviteToken = '';
  let inviteLink = '';

  const push = (step: WizardStepResult) => {
    results.push(step);
    return step.ok;
  };

  const configOk = Boolean(
    config.service_role_configured && config.resend_configured && config.app_url && config.supabase_url !== 'missing',
  );
  const tables = await checkTableHealth(db);
  const requiredTables = ['company_invites', 'companies', 'users', 'pools'];
  const tablesOk = requiredTables.every((table) => tables[table] === 'ok');

  push({
    id: 'config',
    ok: configOk && tablesOk,
    status: configOk && tablesOk ? 'passed' : 'failed',
    message: configOk && tablesOk
      ? 'Config and required tables look good.'
      : `Fix config or tables. Config OK: ${configOk}. Tables: ${requiredTables.map((t) => `${t}=${tables[t]}`).join(', ')}`,
    details: { config, tables },
  });

  const summary = await loadDevCompanySummary(companyId);
  push({
    id: 'company',
    ok: Boolean(summary),
    status: summary ? 'passed' : 'failed',
    message: summary ? `Scoped to ${summary.company_name}.` : 'Select a valid company first.',
    details: summary,
  });

  if (!summary) {
    return { ok: false, message: 'Wizard stopped — no company selected.', steps: results, invite_link: '' };
  }

  const poolResult = await ensureTestPool(db, companyId);
  push({
    id: 'pool',
    ok: poolResult.ok,
    status: poolResult.ok ? 'passed' : 'failed',
    message: poolResult.message,
    details: poolResult,
  });

  const teamUrl = `${origin}/management/team${companyQuery}`;
  const teamProbe = await probeUrl(teamUrl);
  push({
    id: 'manager-routes',
    ok: teamProbe.ok,
    status: teamProbe.ok ? 'passed' : 'failed',
    message: teamProbe.message,
    link: teamUrl,
    details: teamProbe,
  });

  const email = isInviteEmailValid(testEmail) ? testEmail.trim().toLowerCase() : `wizard+${Date.now()}@chemdeck.app`;
  const companyName = await loadCompanyName(db, companyId);

  try {
    const { token } = await createCompanyInvite(db, { companyId, email, createdBy: null });
    inviteToken = token;
    const content = buildInviteEmailContent({
      to: email,
      companyName,
      inviterName: 'Onboarding Wizard',
      token,
      origin,
      hasAccount: false,
    });
    inviteLink = content.signupLink;

    push({
      id: 'create-invite',
      ok: true,
      status: 'passed',
      message: `Invite created for ${email}.`,
      link: inviteLink,
      details: { email, token, invite_link: inviteLink, sign_in_link: content.loginLink },
    });
  } catch (error) {
    push({
      id: 'create-invite',
      ok: false,
      status: 'failed',
      message: (error as Error).message,
    });
    return { ok: false, message: 'Wizard stopped — could not create invite.', steps: results, invite_link: inviteLink };
  }

  const invite = await getInviteByToken(db, inviteToken);
  const preview = invite ? previewInvite(invite) : { ok: false as const, message: 'Invite not found.' };
  const apiResponse = await fetch(`${origin}/api/invites/${encodeURIComponent(inviteToken)}`, { cache: 'no-store' });
  const validateOk = Boolean(invite && preview.ok && apiResponse.ok);

  push({
    id: 'validate-invite',
    ok: validateOk,
    status: validateOk ? 'passed' : 'failed',
    message: validateOk
      ? 'Database and API agree — invite is valid.'
      : !preview.ok
        ? preview.message
        : 'Invite validation failed.',
    link: inviteLink,
    details: { api_status: apiResponse.status, db: invite ? { email: invite.email, status: invite.status } : null },
  });

  const invitePageProbe = await probeUrl(inviteLink);
  push({
    id: 'probe-invite-page',
    ok: invitePageProbe.ok,
    status: invitePageProbe.ok ? 'passed' : 'failed',
    message: invitePageProbe.message,
    link: inviteLink,
    details: invitePageProbe,
  });

  push({
    id: 'manual-join',
    ok: true,
    status: 'manual',
    message: 'Open the invite link in an incognito window, finish signup, and confirm you reach the employee home.',
    link: inviteLink,
    details: {
      checklist: [
        'Open invite link in incognito (not logged in as Dev).',
        'Create account with the invited email address.',
        'Confirm redirect to /employee or employee dashboard.',
        'Mark this step complete below when done.',
      ],
    },
  });

  if (sendEmail && isInviteEmailValid(testEmail)) {
    const emailResult = await sendInviteEmail({
      to: testEmail,
      companyName,
      inviterName: 'Onboarding Wizard',
      token: inviteToken,
      origin,
      hasAccount: false,
    });
    push({
      id: 'send-email',
      ok: emailResult.ok,
      status: emailResult.ok ? 'passed' : 'failed',
      message: emailResult.message,
      link: inviteLink,
      details: emailResult.ok ? { resend_id: emailResult.id } : { resend_test_mode: emailResult.resend_test_mode },
    });
  } else {
    push({
      id: 'send-email',
      ok: true,
      status: 'skipped',
      message: sendEmail ? 'Skipped — enter a valid test email to send.' : 'Skipped — email send not requested.',
    });
  }

  const logUrl = `${origin}/employee/log${companyQuery}`;
  const logProbe = await probeUrl(logUrl);
  push({
    id: 'employee-routes',
    ok: logProbe.ok,
    status: logProbe.ok ? 'passed' : 'failed',
    message: logProbe.message,
    link: logUrl,
    details: logProbe,
  });

  push({
    id: 'manual-first-log',
    ok: true,
    status: 'manual',
    message: 'As the joined employee, open the log page and submit one chemistry reading.',
    link: logUrl,
    details: {
      checklist: [
        'Sign in as the employee you just created.',
        'Open Submit log / employee log.',
        'Pick Wizard Test Pool (or any assigned pool).',
        'Submit one entry and confirm it appears in manager logs.',
      ],
    },
  });

  if (sendNotification) {
    const { data: company } = await db.from('companies').select('settings').eq('id', companyId).maybeSingle();
    const notifyResult = await dispatchAlertNotifications(db, {
      companyId,
      settings: mergeCompanySettings(company?.settings),
      origin,
      alerts: [
        {
          id: 'wizard-test-alert',
          alert_type: 'out_of_range',
          title: 'Onboarding wizard test alert',
          message: 'If you received this, manager notifications are working.',
          severity: 'critical',
        },
      ],
    });
    const notifyOk = notifyResult.sent > 0;
    push({
      id: 'notification',
      ok: notifyOk,
      status: notifyOk ? 'passed' : 'failed',
      message: notifyOk
        ? `Sent to ${notifyResult.sent} manager address(es).`
        : notifyResult.failures[0] || 'No manager emails on this company to notify.',
      details: notifyResult,
    });
  } else {
    push({
      id: 'notification',
      ok: true,
      status: 'skipped',
      message: 'Skipped — notification test not requested.',
    });
  }

  const autoSteps = results.filter((step) => {
    const def = onboardingWizardSteps.find((item) => item.id === step.id);
    return def?.kind === 'auto';
  });
  const autoOk = autoSteps.every((step) => step.ok);

  return {
    ok: autoOk,
    message: autoOk
      ? 'Automated onboarding checks passed. Complete the manual steps in incognito.'
      : 'Some automated checks failed — review steps below.',
    steps: results,
    invite_link: inviteLink,
    test_email: email,
  };
}

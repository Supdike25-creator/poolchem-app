import { NextRequest, NextResponse } from 'next/server';
import { assertDevRequest, getDevCompanyId, logDevMessage, logDevRequest } from '@/lib/devTools';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  buildEmailPreviews,
  buildRouteGroups,
  checkTableHealth,
  ensureDevLabInvites,
  loadCompanyName,
  loadPendingInviteRows,
  readDevTestLabConfig,
  resolveLinkedInviteScenario,
} from '@/lib/devTestLab';
import {
  createCompanyInvite,
  getInviteByToken,
  previewInvite,
} from '@/lib/companyInvites';
import { buildInviteEmailContent, sendInviteEmail } from '@/lib/inviteEmail';
import { getAppBaseUrl } from '@/lib/inviteLinks';
import { dispatchAlertNotifications } from '@/lib/notifications';
import { mergeCompanySettings } from '@/lib/companySettings';
import { runOnboardingWizard } from '@/lib/devOnboardingWizard';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const forbidden = assertDevRequest(request);
  if (forbidden) return forbidden;

  const origin = getAppBaseUrl(request.nextUrl.origin);
  const companyId = await getDevCompanyId(request);
  const linkedEmailParam = request.nextUrl.searchParams.get('linkedEmail')?.trim() ?? '';
  const config = readDevTestLabConfig(origin);

  let companyName = 'My Pool Company';
  let pendingInvites: Awaited<ReturnType<typeof loadPendingInviteRows>> = [];
  let tableHealth: Record<string, string> = {};
  let labTokens: { unlinkedToken: string; linkedToken: string } | null = null;
  let linkedScenario = {
    linkedEmail: linkedEmailParam,
    hasAccount: false,
  };

  if (config.service_role_configured) {
    try {
      const db = createAdminClient();
      tableHealth = await checkTableHealth(db);
      linkedScenario = await resolveLinkedInviteScenario(db, linkedScenario.linkedEmail);

      if (companyId) {
        companyName = await loadCompanyName(db, companyId);
        labTokens = await ensureDevLabInvites(db, companyId, linkedScenario.linkedEmail);
        pendingInvites = await loadPendingInviteRows(db, companyId, origin);
      }
    } catch (error) {
      return NextResponse.json({
        ok: false,
        message: (error as Error).message,
        config,
      });
    }
  }

  const emailPreviews = buildEmailPreviews({
    origin,
    companyName,
    unlinkedToken: labTokens?.unlinkedToken,
    linkedToken: labTokens?.linkedToken,
    linkedEmail: linkedScenario.linkedEmail,
    linkedHasAccount: linkedScenario.hasAccount,
  });

  return NextResponse.json({
    ok: true,
    config,
    company: companyId ? { id: companyId, name: companyName } : null,
    pending_invites: pendingInvites,
    linked_scenario: linkedScenario,
    email_previews: emailPreviews,
    routes: buildRouteGroups(companyId),
    table_health: tableHealth,
  });
}

export async function POST(request: NextRequest) {
  const forbidden = assertDevRequest(request);
  if (forbidden) return forbidden;

  const body = await request.json().catch(() => null) as {
    action?: string;
    companyId?: string | null;
    email?: string;
    token?: string;
    sendEmail?: boolean;
    sendNotification?: boolean;
  } | null;

  const action = body?.action?.trim();
  const origin = getAppBaseUrl(request.nextUrl.origin);
  const companyId = (await getDevCompanyId(request)) ?? body?.companyId?.trim() ?? null;

  if (!action) {
    return NextResponse.json({ ok: false, message: 'Missing action.' }, { status: 400 });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { ok: false, message: 'SUPABASE_SERVICE_ROLE_KEY is required for test lab actions.' },
      { status: 503 },
    );
  }

  const db = createAdminClient();

  try {
    if (action === 'validate-invite') {
      const token = body?.token?.trim();
      if (!token) {
        return NextResponse.json({ ok: false, message: 'Token is required.' }, { status: 400 });
      }

      const invite = await getInviteByToken(db, token);
      if (!invite) {
        await logDevRequest({ method: 'POST', path: '/api/dev/test-lab', status: 404, message: 'Invite not found' });
        return NextResponse.json({
          ok: false,
          message: 'Invite not found in database.',
          step: 'lookup',
          api_url: `/api/invites/${token}`,
        });
      }

      const preview = previewInvite(invite);
      const apiResponse = await fetch(`${origin}/api/invites/${encodeURIComponent(token)}`, { cache: 'no-store' });
      const apiJson = await apiResponse.json().catch(() => null);

      return NextResponse.json({
        ok: preview.ok && apiResponse.ok,
        message: preview.ok ? 'Invite is valid and API returns OK.' : preview.message,
        step: 'validate',
        db_invite: {
          email: invite.email,
          status: invite.status,
          expires_at: invite.expires_at,
          company: invite.companies?.company_name ?? null,
        },
        api_status: apiResponse.status,
        api_body: apiJson,
        invite_page: `${origin}/invite/${token}`,
        sign_in_page: `${origin}/invite/${token}?mode=login`,
      });
    }

    if (action === 'create-test-invite') {
      if (!companyId) {
        return NextResponse.json({ ok: false, message: 'Select a company first.' }, { status: 400 });
      }

      const email = body?.email?.trim().toLowerCase() || `dev-test+${Date.now()}@chemdeck.app`;
      const { token } = await createCompanyInvite(db, { companyId, email, createdBy: null });
      const companyName = await loadCompanyName(db, companyId);
      const content = buildInviteEmailContent({
        to: email,
        companyName,
        inviterName: 'Dev Test Lab',
        token,
        origin,
        hasAccount: false,
      });

      await logDevMessage('info', 'Test invite created', { email, token, companyId });

      return NextResponse.json({
        ok: true,
        message: `Test invite created for ${email}.`,
        email,
        token,
        invite_link: content.signupLink,
        sign_in_link: content.loginLink,
        email_preview: {
          subject: content.subject,
          html: content.html,
          text: content.text,
        },
      });
    }

    if (action === 'send-test-invite') {
      if (!companyId) {
        return NextResponse.json({ ok: false, message: 'Select a company first.' }, { status: 400 });
      }

      const email = body?.email?.trim().toLowerCase();
      if (!email) {
        return NextResponse.json({ ok: false, message: 'Recipient email is required.' }, { status: 400 });
      }

      const companyName = await loadCompanyName(db, companyId);
      const { token } = await createCompanyInvite(db, { companyId, email, createdBy: null });
      const result = await sendInviteEmail({
        to: email,
        companyName,
        inviterName: 'Dev Test Lab',
        token,
        origin,
        hasAccount: false,
      });

      const status = result.ok ? 200 : 400;
      await logDevRequest({ method: 'POST', path: '/api/dev/test-lab', status, message: result.message });

      return NextResponse.json({
        ok: result.ok,
        message: result.message,
        invite_link: result.signupLink,
        sign_in_link: result.loginLink,
        resend_id: result.ok ? result.id : undefined,
        email_preview: result.ok
          ? { subject: result.subject, html: result.html }
          : undefined,
      });
    }

    if (action === 'send-test-notification') {
      if (!companyId) {
        return NextResponse.json({ ok: false, message: 'Select a company first.' }, { status: 400 });
      }

      const { data: company } = await db.from('companies').select('settings').eq('id', companyId).maybeSingle();
      const result = await dispatchAlertNotifications(db, {
        companyId,
        settings: mergeCompanySettings(company?.settings),
        origin,
        alerts: [
          {
            id: 'dev-lab-test',
            alert_type: 'out_of_range',
            title: 'Dev Test Lab alert',
            message: 'This is a test alert email from the Dev Test Lab.',
            severity: 'critical',
          },
        ],
      });

      const ok = result.sent > 0;
      return NextResponse.json({
        ok,
        message: ok
          ? `Notification sent to ${result.sent} address(es).`
          : result.failures[0] || 'No notification sent.',
        details: result,
      });
    }

    if (action === 'run-onboarding-wizard') {
      if (!companyId) {
        return NextResponse.json({ ok: false, message: 'Select a company first.' }, { status: 400 });
      }

      const result = await runOnboardingWizard({
        db,
        companyId,
        origin,
        testEmail: body?.email?.trim() ?? '',
        sendEmail: Boolean(body?.sendEmail),
        sendNotification: Boolean(body?.sendNotification),
      });

      await logDevMessage(result.ok ? 'info' : 'warn', result.message, {
        companyId,
        invite_link: result.invite_link,
        step_count: result.steps.length,
      });

      return NextResponse.json(result);
    }

    if (action === 'probe-url') {
      const url = (body as { url?: string }).url?.trim();
      if (!url?.startsWith('http')) {
        return NextResponse.json({ ok: false, message: 'Pass url in body.' }, { status: 400 });
      }

      const started = Date.now();
      const response = await fetch(url, { redirect: 'follow' });
      const elapsed = Date.now() - started;

      return NextResponse.json({
        ok: response.ok,
        message: `${response.status} ${response.statusText} (${elapsed}ms)`,
        final_url: response.url,
        status: response.status,
      });
    }

    return NextResponse.json({ ok: false, message: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    const message = (error as Error).message || 'Test lab action failed.';
    await logDevRequest({ method: 'POST', path: '/api/dev/test-lab', status: 500, message });
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

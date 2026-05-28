import { NextRequest, NextResponse } from 'next/server';
import { assertDevRequest, getDevCompanyId, logDevMessage, logDevRequest } from '@/lib/devTools';
import { mergeCompanySettings } from '@/lib/companySettings';
import { dispatchAlertNotifications } from '@/lib/notifications';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const forbidden = assertDevRequest(request);
  if (forbidden) return forbidden;

  const companyId = await getDevCompanyId(request);
  if (!companyId) {
    await logDevRequest({ method: 'POST', path: '/api/dev/test-notification', status: 400 });
    return NextResponse.json(
      { ok: false, message: 'Select a company in the dev dashboard first.' },
      { status: 400 },
    );
  }

  const accountDb = createAdminClient();
  const { data: company } = await accountDb
    .from('companies')
    .select('settings')
    .eq('id', companyId)
    .maybeSingle();

  const result = await dispatchAlertNotifications(accountDb, {
    companyId,
    settings: mergeCompanySettings(company?.settings),
    origin: request.nextUrl.origin,
    alerts: [
      {
        id: 'dev-test',
        alert_type: 'out_of_range',
        title: 'Dev test pool alert',
        message: 'This is a test notification from the ChemDeck dev dashboard.',
        severity: 'critical',
      },
    ],
  });

  const ok = result.failures.length === 0 && result.sent > 0;
  const message =
    result.sent > 0
      ? `Test notification sent to ${result.sent} manager email address${result.sent === 1 ? '' : 'es'}.`
      : result.failures[0] || 'No notification was sent. Check manager emails and notification settings.';

  const status = ok ? 200 : 400;
  await logDevRequest({ method: 'POST', path: '/api/dev/test-notification', status, message });
  await logDevMessage(ok ? 'info' : 'error', message, { companyId, details: result });

  return NextResponse.json({ ok, message, details: result }, { status });
}

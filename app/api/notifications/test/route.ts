import { NextRequest, NextResponse } from 'next/server';
import { resolveManagerApiScope } from '@/lib/managerApiScope';
import { dispatchAlertNotifications } from '@/lib/notifications';
import { mergeCompanySettings } from '@/lib/companySettings';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const context = await resolveManagerApiScope(request);
  if (!context.ok) return context.response;

  const { companyId, accountDb } = context.scope;
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
        id: 'test',
        alert_type: 'out_of_range',
        title: 'Test pool alert',
        message: 'This is a test notification from ChemDeck settings. Managers receive emails when alerts fire.',
        severity: 'critical',
      },
    ],
  });

  return NextResponse.json({
    ok: result.failures.length === 0,
    message:
      result.sent > 0
        ? `Test notification sent to ${result.sent} manager email address${result.sent === 1 ? '' : 'es'}.`
        : result.failures[0] || 'No notification was sent.',
    details: result,
  }, { status: result.sent > 0 ? 200 : 400 });
}

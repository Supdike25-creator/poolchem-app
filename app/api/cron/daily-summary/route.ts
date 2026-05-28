import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { mergeCompanySettings } from '@/lib/companySettings';
import { dispatchDailySummaryNotifications } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

const authorizeCron = (request: NextRequest) => {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get('authorization')?.trim();
  return auth === `Bearer ${secret}`;
};

export async function GET(request: NextRequest) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ ok: false, message: 'Unauthorized.' }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: companies, error } = await admin.from('companies').select('id, settings');

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  const origin = request.nextUrl.origin;
  const results: Array<{ company_id: string; sent: number; failures: string[] }> = [];

  for (const company of companies ?? []) {
    const settings = mergeCompanySettings(company.settings);
    if (!settings.masterNotifications || !settings.dailySummary) continue;

    const result = await dispatchDailySummaryNotifications(admin, {
      companyId: company.id,
      origin,
    });

    results.push({
      company_id: company.id,
      sent: result.sent,
      failures: result.failures,
    });
  }

  return NextResponse.json({
    ok: true,
    message: `Daily summary processed for ${results.length} companies.`,
    results,
  });
}

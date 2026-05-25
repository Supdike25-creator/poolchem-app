import { NextRequest, NextResponse } from 'next/server';
import { assertDevRequest, getDevCompanyId, getAdminOrError, logDevMessage, logDevRequest } from '@/lib/devTools';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const forbidden = assertDevRequest(request);
  if (forbidden) return forbidden;

  const { supabase, error: adminError } = getAdminOrError();
  if (!supabase) {
    await logDevRequest({ method: 'POST', path: '/api/dev/simulate-alert', status: 500, message: adminError ?? undefined });
    return NextResponse.json({ ok: false, message: adminError }, { status: 500 });
  }

  const companyId = await getDevCompanyId(request);
  if (!companyId) {
    await logDevRequest({ method: 'POST', path: '/api/dev/simulate-alert', status: 400, message: 'Missing selected company.' });
    return NextResponse.json({ ok: false, message: 'Select a company before simulating an alert.' }, { status: 400 });
  }

  const payload = {
    severity: 'warning',
    alert_type: 'chemistry_range',
    title: 'Simulated chlorine drift',
    message: 'Demo Pool reported free chlorine below the configured range.',
    source: 'dev-dashboard',
    metadata: {
      company_id: companyId,
      dev_test: true,
      pool: 'Demo Pool',
      freeChlorine: 0.6,
      ph: 8.1,
    },
  };

  const { data, error } = await supabase.from('dev_alerts').insert(payload).select('id,created_at').single();
  const status = error ? 500 : 202;

  await logDevRequest({ method: 'POST', path: '/api/dev/simulate-alert', status, message: error?.message });
  await logDevMessage(error ? 'error' : 'alerts', error ? `Simulated alert failed: ${error.message}` : 'Simulated alert inserted.', data ?? payload);

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status });
  }

  return NextResponse.json(
    {
      ok: true,
      message: 'Simulated alert accepted.',
      details: {
        ...payload,
        selected_company_id: companyId,
        id: data?.id,
        created_at: data?.created_at,
      },
    },
    { status },
  );
}

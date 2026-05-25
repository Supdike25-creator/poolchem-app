import { NextRequest, NextResponse } from 'next/server';
import { assertDevRequest, getDevCompanyId, getAdminOrError, logDevMessage, logDevRequest } from '@/lib/devTools';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const forbidden = assertDevRequest(request);
  if (forbidden) return forbidden;

  const { supabase, error: adminError } = getAdminOrError();
  if (!supabase) {
    await logDevRequest({ method: 'POST', path: '/api/dev/clear-test-data', status: 500, message: adminError ?? undefined });
    return NextResponse.json({ ok: false, message: adminError }, { status: 500 });
  }

  const companyId = await getDevCompanyId(request);
  if (!companyId) {
    await logDevRequest({ method: 'POST', path: '/api/dev/clear-test-data', status: 400, message: 'Missing selected company.' });
    return NextResponse.json({ ok: false, message: 'Select a company before clearing test data.' }, { status: 400 });
  }

  const { data: testPool } = await supabase
    .from('pools')
    .select('id')
    .eq('name', 'ChemDeck Dev Test Pool')
    .eq('company_id', companyId)
    .maybeSingle();

  const deletions: Record<string, unknown> = {};

  if (testPool?.id) {
    const { error } = await supabase.from('chemical_logs').delete().eq('pool_id', testPool.id);
    deletions.chemical_logs = error?.message ?? 'deleted';
  }

  const { error: alertsError } = await supabase
    .from('dev_alerts')
    .delete()
    .eq('source', 'dev-dashboard')
    .contains('metadata', { company_id: companyId });
  deletions.dev_alerts = alertsError?.message ?? 'deleted';

  const { error: logsError } = await supabase.from('dev_raw_logs').delete().like('message', '%Test chem log%');
  deletions.dev_raw_logs = logsError?.message ?? 'deleted matching test log rows';

  const failed = Object.values(deletions).some((value) => typeof value === 'string' && value !== 'deleted' && !value.includes('deleted matching'));
  const status = failed ? 500 : 200;

  await logDevRequest({ method: 'POST', path: '/api/dev/clear-test-data', status });
  await logDevMessage(failed ? 'error' : 'data', failed ? 'Clear test data completed with errors.' : 'Clear test data completed.', deletions);

  return NextResponse.json({
    ok: !failed,
    message: failed ? 'Clear test data completed with errors.' : 'Clear test data completed.',
    details: {
      deletions,
      selected_company_id: companyId,
      mode: 'database',
    },
  }, { status });
}

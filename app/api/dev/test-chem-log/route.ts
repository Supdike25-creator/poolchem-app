import { NextRequest, NextResponse } from 'next/server';
import { assertDevRequest, getDevCompanyId, getAdminOrError, logDevMessage, logDevRequest } from '@/lib/devTools';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const forbidden = assertDevRequest(request);
  if (forbidden) return forbidden;

  const { supabase, error: adminError } = getAdminOrError();
  if (!supabase) {
    await logDevRequest({ method: 'POST', path: '/api/dev/test-chem-log', status: 500, message: adminError ?? undefined });
    return NextResponse.json({ ok: false, message: adminError }, { status: 500 });
  }

  const companyId = await getDevCompanyId(request);
  if (!companyId) {
    await logDevRequest({ method: 'POST', path: '/api/dev/test-chem-log', status: 400, message: 'Missing selected company.' });
    return NextResponse.json({ ok: false, message: 'Select a company before inserting a test chem log.' }, { status: 400 });
  }

  const { data: pool, error: poolError } = await supabase
    .from('pools')
    .select('id,name')
    .eq('name', 'ChemDeck Dev Test Pool')
    .eq('company_id', companyId)
    .maybeSingle();

  let poolId = pool?.id;
  let poolName = pool?.name ?? 'ChemDeck Dev Test Pool';

  if (!poolId) {
    const { data: insertedPool, error: insertPoolError } = await supabase
      .from('pools')
      .insert({
        name: 'ChemDeck Dev Test Pool',
        company_id: companyId,
        pool_type: 'Dev',
        volume_gallons: 25000,
        target_chlorine_min: 1,
        target_chlorine_max: 4,
        target_ph_min: 7.2,
        target_ph_max: 7.8,
        notes: 'Created by the Dev Dashboard test chem log tool.',
      })
      .select('id,name')
      .single();

    if (insertPoolError) {
      const status = 500;
      await logDevRequest({ method: 'POST', path: '/api/dev/test-chem-log', status, message: insertPoolError.message });
      await logDevMessage('error', `Test pool insert failed: ${insertPoolError.message}`);
      return NextResponse.json({ ok: false, message: insertPoolError.message }, { status });
    }

    poolId = insertedPool.id;
    poolName = insertedPool.name;
  } else if (poolError) {
    const status = 500;
    await logDevRequest({ method: 'POST', path: '/api/dev/test-chem-log', status, message: poolError.message });
    await logDevMessage('error', `Test pool lookup failed: ${poolError.message}`);
    return NextResponse.json({ ok: false, message: poolError.message }, { status });
  }

  const { data: log, error: logError } = await supabase
    .from('chemical_logs')
    .insert({
      pool_id: poolId,
      free_chlorine: 2.4,
      ph: 7.5,
      notes: `DEV_TEST_DATA: ChemDeck Dev Dashboard test chemistry submission for company ${companyId}.`,
      photo_url: null,
      dosing_amount: null,
      dosing_unit: null,
      dosing_chemical: 'chlorine',
      dosing_recommendation: 'No chlorine needed',
    })
    .select('id,created_at')
    .single();

  const status = logError ? 500 : 201;
  await logDevRequest({ method: 'POST', path: '/api/dev/test-chem-log', status, message: logError?.message });
  await logDevMessage(logError ? 'error' : 'chem-log', logError ? `Test chem log failed: ${logError.message}` : 'Test chem log inserted.', log);

  if (logError) {
    return NextResponse.json({ ok: false, message: logError.message }, { status });
  }

  return NextResponse.json(
    {
      ok: true,
      message: 'Test chem log validated.',
      details: {
        id: log?.id,
        company_id: companyId,
        pool: poolName,
        freeChlorine: 2.4,
        ph: 7.5,
        submittedBy: 'ChemDeckDev',
        persisted: true,
        created_at: log?.created_at,
      },
    },
    { status },
  );
}

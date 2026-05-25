import { NextRequest, NextResponse } from 'next/server';
import { assertDevRequest, resolveDevCompanyId, getAdminOrError, logDevMessage, logDevRequest } from '@/lib/devTools';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const forbidden = assertDevRequest(request);
  if (forbidden) return forbidden;

  const { supabase, error: adminError } = getAdminOrError();
  if (!supabase) {
    return NextResponse.json({ ok: false, message: adminError }, { status: 500 });
  }

  const body = await request.json().catch(() => null) as {
    pool_id?: string;
    free_chlorine?: number;
    ph?: number;
    notes?: string | null;
    photo_url?: string | null;
    companyId?: string | null;
  } | null;

  const poolId = body?.pool_id?.trim();
  if (!poolId) {
    return NextResponse.json({ ok: false, message: 'Select a pool before submitting.' }, { status: 400 });
  }

  const companyId = await resolveDevCompanyId(supabase, body?.companyId);

  const { data: pool, error: poolError } = await supabase
    .from('pools')
    .select('id,name,company_id')
    .eq('id', poolId)
    .maybeSingle();

  if (poolError || !pool) {
    return NextResponse.json({ ok: false, message: poolError?.message || 'Pool not found.' }, { status: 404 });
  }

  if (companyId && pool.company_id !== companyId) {
    return NextResponse.json({ ok: false, message: 'That pool does not belong to the selected company.' }, { status: 400 });
  }

  const freeChlorine = Number(body?.free_chlorine);
  const ph = Number(body?.ph);

  if (!Number.isFinite(freeChlorine) || !Number.isFinite(ph)) {
    return NextResponse.json({ ok: false, message: 'Enter valid chlorine and pH values.' }, { status: 400 });
  }

  const { data: log, error: logError } = await supabase
    .from('chemical_logs')
    .insert({
      pool_id: poolId,
      free_chlorine: freeChlorine,
      ph,
      notes: body?.notes?.trim() || null,
      photo_url: body?.photo_url?.trim() || null,
      dosing_amount: null,
      dosing_unit: null,
      dosing_chemical: 'chlorine',
      dosing_recommendation: 'Dev guard log submission',
    })
    .select('id,created_at')
    .single();

  const status = logError ? 500 : 201;
  await logDevRequest({ method: 'POST', path: '/api/dev/guard-log', status, message: logError?.message });
  await logDevMessage(logError ? 'error' : 'chem-log', logError ? `Dev guard log failed: ${logError.message}` : 'Dev guard log submitted.', log);

  if (logError) {
    return NextResponse.json({ ok: false, message: logError.message }, { status });
  }

  return NextResponse.json(
    {
      ok: true,
      message: 'Chemistry log submitted.',
      details: {
        id: log?.id,
        pool_id: poolId,
        pool_name: pool.name,
        company_id: pool.company_id,
        created_at: log?.created_at,
      },
    },
    { status },
  );
}

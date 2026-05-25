import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { mergeCompanySettings, getPhotoRequirementMessage } from '@/lib/companySettings';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ ok: false, message: 'Unauthorized.' }, { status: 401 });
  }

  const body = await request.json().catch(() => null) as {
    pool_id?: string;
    free_chlorine?: number;
    ph?: number;
    notes?: string | null;
    photo_url?: string | null;
  } | null;

  const poolId = body?.pool_id?.trim();
  if (!poolId) {
    return NextResponse.json({ ok: false, message: 'Select a pool before submitting.' }, { status: 400 });
  }

  const freeChlorine = Number(body?.free_chlorine);
  const ph = Number(body?.ph);
  if (!Number.isFinite(freeChlorine) || !Number.isFinite(ph)) {
    return NextResponse.json({ ok: false, message: 'Enter valid chlorine and pH values.' }, { status: 400 });
  }

  const accountDb = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : supabase;
  const { data: account } = await accountDb
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .maybeSingle();

  const companyId = account?.company_id ?? null;
  if (!companyId) {
    return NextResponse.json({ ok: false, message: 'Join a company before submitting logs.' }, { status: 400 });
  }

  const { data: pool, error: poolError } = await accountDb
    .from('pools')
    .select('id, company_id, pool_type, target_chlorine_min, target_chlorine_max, target_ph_min, target_ph_max')
    .eq('id', poolId)
    .maybeSingle();

  if (poolError || !pool || pool.company_id !== companyId) {
    return NextResponse.json({ ok: false, message: poolError?.message || 'Pool not found.' }, { status: 404 });
  }

  const { data: company } = await accountDb
    .from('companies')
    .select('settings')
    .eq('id', companyId)
    .maybeSingle();

  const settings = mergeCompanySettings(company?.settings);
  const photoUrl = body?.photo_url?.trim() || null;
  const photoMessage = getPhotoRequirementMessage(
    settings,
    {
      freeChlorine,
      ph,
      poolType: pool.pool_type,
      chlorineMin: pool.target_chlorine_min,
      chlorineMax: pool.target_chlorine_max,
      phMin: pool.target_ph_min,
      phMax: pool.target_ph_max,
    },
    Boolean(photoUrl),
  );

  if (photoMessage) {
    return NextResponse.json({ ok: false, message: photoMessage }, { status: 400 });
  }

  const { data: log, error: logError } = await accountDb
    .from('chemical_logs')
    .insert({
      pool_id: poolId,
      submitted_by: user.id,
      free_chlorine: freeChlorine,
      ph,
      notes: body?.notes?.trim() || null,
      photo_url: photoUrl,
    })
    .select('id, created_at')
    .single();

  if (logError) {
    return NextResponse.json({ ok: false, message: logError.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    message: 'Chemistry log submitted.',
    log,
  }, { status: 201 });
}

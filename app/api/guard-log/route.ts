import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { mergeCompanySettings, getPhotoRequirementMessage } from '@/lib/companySettings';

export const dynamic = 'force-dynamic';

const EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;

const getAuthContext = async () => {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: NextResponse.json({ ok: false, message: 'Unauthorized.' }, { status: 401 }) };
  }

  const accountDb = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : supabase;
  const { data: account } = await accountDb
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .maybeSingle();

  const companyId = account?.company_id ?? null;
  if (!companyId) {
    return { error: NextResponse.json({ ok: false, message: 'Join a company before submitting logs.' }, { status: 400 }) };
  }

  return { user, companyId, accountDb };
};

export async function GET(request: NextRequest) {
  const context = await getAuthContext();
  if ('error' in context && context.error) return context.error;

  const logId = request.nextUrl.searchParams.get('logId')?.trim();
  if (!logId) {
    return NextResponse.json({ ok: false, message: 'Log id is required.' }, { status: 400 });
  }

  const { user, accountDb } = context;
  const { data: log, error } = await accountDb
    .from('chemical_logs')
    .select('id, pool_id, submitted_by, free_chlorine, ph, notes, photo_url, created_at')
    .eq('id', logId)
    .maybeSingle();

  if (error || !log) {
    return NextResponse.json({ ok: false, message: error?.message || 'Log not found.' }, { status: 404 });
  }

  if (log.submitted_by !== user.id) {
    return NextResponse.json({ ok: false, message: 'You can only edit your own logs.' }, { status: 403 });
  }

  return NextResponse.json({ ok: true, log });
}

export async function POST(request: NextRequest) {
  const context = await getAuthContext();
  if ('error' in context && context.error) return context.error;

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

  const { user, companyId, accountDb } = context;
  const validation = await validatePhotoRules(accountDb, companyId, poolId, freeChlorine, ph, body?.photo_url?.trim() || null);
  if ('error' in validation) return validation.error;

  const { data: log, error: logError } = await accountDb
    .from('chemical_logs')
    .insert({
      pool_id: poolId,
      submitted_by: user.id,
      free_chlorine: freeChlorine,
      ph,
      notes: body?.notes?.trim() || null,
      photo_url: body?.photo_url?.trim() || null,
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

export async function PATCH(request: NextRequest) {
  const context = await getAuthContext();
  if ('error' in context && context.error) return context.error;

  const body = await request.json().catch(() => null) as {
    log_id?: string;
    pool_id?: string;
    free_chlorine?: number;
    ph?: number;
    notes?: string | null;
    photo_url?: string | null;
  } | null;

  const logId = body?.log_id?.trim();
  const poolId = body?.pool_id?.trim();
  if (!logId || !poolId) {
    return NextResponse.json({ ok: false, message: 'Log id and pool are required.' }, { status: 400 });
  }

  const freeChlorine = Number(body?.free_chlorine);
  const ph = Number(body?.ph);
  if (!Number.isFinite(freeChlorine) || !Number.isFinite(ph)) {
    return NextResponse.json({ ok: false, message: 'Enter valid chlorine and pH values.' }, { status: 400 });
  }

  const { user, companyId, accountDb } = context;
  const { data: existing, error: existingError } = await accountDb
    .from('chemical_logs')
    .select('id, submitted_by, created_at, photo_url')
    .eq('id', logId)
    .maybeSingle();

  if (existingError || !existing) {
    return NextResponse.json({ ok: false, message: existingError?.message || 'Log not found.' }, { status: 404 });
  }

  if (existing.submitted_by !== user.id) {
    return NextResponse.json({ ok: false, message: 'You can only edit your own logs.' }, { status: 403 });
  }

  const ageMs = Date.now() - new Date(existing.created_at).getTime();
  if (ageMs > EDIT_WINDOW_MS) {
    return NextResponse.json({ ok: false, message: 'This log is older than 24 hours and can no longer be edited.' }, { status: 400 });
  }

  const photoUrl = body?.photo_url?.trim() || existing.photo_url || null;
  const validation = await validatePhotoRules(accountDb, companyId, poolId, freeChlorine, ph, photoUrl);
  if ('error' in validation) return validation.error;

  const { data: log, error: updateError } = await accountDb
    .from('chemical_logs')
    .update({
      pool_id: poolId,
      free_chlorine: freeChlorine,
      ph,
      notes: body?.notes?.trim() || null,
      photo_url: photoUrl,
    })
    .eq('id', logId)
    .select('id, created_at')
    .single();

  if (updateError) {
    return NextResponse.json({ ok: false, message: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message: 'Chemistry log updated.', log });
}

async function validatePhotoRules(
  accountDb: ReturnType<typeof createAdminClient>,
  companyId: string,
  poolId: string,
  freeChlorine: number,
  ph: number,
  photoUrl: string | null,
) {
  const { data: pool, error: poolError } = await accountDb
    .from('pools')
    .select('id, company_id, pool_type, target_chlorine_min, target_chlorine_max, target_ph_min, target_ph_max')
    .eq('id', poolId)
    .maybeSingle();

  if (poolError || !pool || pool.company_id !== companyId) {
    return { error: NextResponse.json({ ok: false, message: poolError?.message || 'Pool not found.' }, { status: 404 }) };
  }

  const { data: company } = await accountDb
    .from('companies')
    .select('settings')
    .eq('id', companyId)
    .maybeSingle();

  const settings = mergeCompanySettings(company?.settings);
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
    return { error: NextResponse.json({ ok: false, message: photoMessage }, { status: 400 }) };
  }

  return { pool };
}

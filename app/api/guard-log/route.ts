import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveApiCompanyScope } from '@/lib/apiCompanyScope';
import { isUuid } from '@/lib/devCompanyScope';
import { mergeCompanySettings, getPhotoRequirementMessage } from '@/lib/companySettings';
import { createAlertsForLog } from '@/lib/alerts';

export const dynamic = 'force-dynamic';

const EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;

const getLogContext = async (request: NextRequest) => {
  const context = await resolveApiCompanyScope(request);
  if (!context.ok) {
    return { error: context.response };
  }

  const { companyId, userId, accountDb, isDevPreview } = context.scope;
  const submitterId = userId && isUuid(userId) ? userId : null;

  return { companyId, accountDb, submitterId, isDevPreview };
};

export async function GET(request: NextRequest) {
  const context = await getLogContext(request);
  if ('error' in context && context.error) return context.error;

  const logId = request.nextUrl.searchParams.get('logId')?.trim();
  if (!logId) {
    return NextResponse.json({ ok: false, message: 'Log id is required.' }, { status: 400 });
  }

  const { submitterId, accountDb, isDevPreview } = context;
  const { data: log, error } = await accountDb
    .from('chemical_logs')
    .select('id, pool_id, submitted_by, free_chlorine, ph, notes, photo_url, created_at')
    .eq('id', logId)
    .maybeSingle();

  if (error || !log) {
    return NextResponse.json({ ok: false, message: error?.message || 'Log not found.' }, { status: 404 });
  }

  if (!isDevPreview && submitterId && log.submitted_by !== submitterId) {
    return NextResponse.json({ ok: false, message: 'You can only edit your own logs.' }, { status: 403 });
  }

  return NextResponse.json({ ok: true, log });
}

export async function POST(request: NextRequest) {
  const context = await getLogContext(request);
  if ('error' in context && context.error) return context.error;

  const body = await request.json().catch(() => null) as {
    pool_id?: string;
    free_chlorine?: number;
    ph?: number;
    notes?: string | null;
    photo_url?: string | null;
    dosing_amount?: number | null;
    dosing_unit?: string | null;
    dosing_chemical?: string | null;
    dosing_recommendation?: string | null;
    companyId?: string | null;
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

  const { companyId, submitterId, accountDb } = context;
  const validation = await validatePhotoRules(accountDb, companyId, poolId, freeChlorine, ph, body?.photo_url?.trim() || null);
  if ('error' in validation) return validation.error;

  const photoUrl = body?.photo_url?.trim() || null;
  const { data: log, error: logError } = await accountDb
    .from('chemical_logs')
    .insert({
      pool_id: poolId,
      submitted_by: submitterId,
      free_chlorine: freeChlorine,
      ph,
      notes: body?.notes?.trim() || null,
      photo_url: photoUrl,
      dosing_amount: body?.dosing_amount ?? null,
      dosing_unit: body?.dosing_unit?.trim() || null,
      dosing_chemical: body?.dosing_chemical?.trim() || null,
      dosing_recommendation: body?.dosing_recommendation?.trim() || null,
    })
    .select('id, created_at')
    .single();

  if (logError) {
    return NextResponse.json({ ok: false, message: logError.message }, { status: 500 });
  }

  const alerts = await maybeCreateAlerts(accountDb, {
    companyId,
    pool: validation.pool,
    logId: log.id,
    freeChlorine,
    ph,
    photoUrl,
  });

  return NextResponse.json({
    ok: true,
    message: 'Chemistry log submitted.',
    log,
    alerts_created: alerts.length,
  }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const context = await getLogContext(request);
  if ('error' in context && context.error) return context.error;

  const body = await request.json().catch(() => null) as {
    log_id?: string;
    pool_id?: string;
    free_chlorine?: number;
    ph?: number;
    notes?: string | null;
    photo_url?: string | null;
    dosing_amount?: number | null;
    dosing_unit?: string | null;
    dosing_chemical?: string | null;
    dosing_recommendation?: string | null;
    companyId?: string | null;
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

  const { companyId, submitterId, accountDb, isDevPreview } = context;
  const { data: existing, error: existingError } = await accountDb
    .from('chemical_logs')
    .select('id, submitted_by, created_at, photo_url')
    .eq('id', logId)
    .maybeSingle();

  if (existingError || !existing) {
    return NextResponse.json({ ok: false, message: existingError?.message || 'Log not found.' }, { status: 404 });
  }

  if (!isDevPreview && submitterId && existing.submitted_by !== submitterId) {
    return NextResponse.json({ ok: false, message: 'You can only edit your own logs.' }, { status: 403 });
  }

  const ageMs = Date.now() - new Date(existing.created_at).getTime();
  if (!isDevPreview && ageMs > EDIT_WINDOW_MS) {
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
      dosing_amount: body?.dosing_amount ?? null,
      dosing_unit: body?.dosing_unit?.trim() || null,
      dosing_chemical: body?.dosing_chemical?.trim() || null,
      dosing_recommendation: body?.dosing_recommendation?.trim() || null,
    })
    .eq('id', logId)
    .select('id, created_at')
    .single();

  if (updateError) {
    return NextResponse.json({ ok: false, message: updateError.message }, { status: 500 });
  }

  const alerts = await maybeCreateAlerts(accountDb, {
    companyId,
    pool: validation.pool,
    logId: log.id,
    freeChlorine,
    ph,
    photoUrl,
  });

  return NextResponse.json({ ok: true, message: 'Chemistry log updated.', log, alerts_created: alerts.length });
}

async function validatePhotoRules(
  accountDb: SupabaseClient,
  companyId: string,
  poolId: string,
  freeChlorine: number,
  ph: number,
  photoUrl: string | null,
) {
  const { data: pool, error: poolError } = await accountDb
    .from('pools')
    .select('id, name, company_id, pool_type, target_chlorine_min, target_chlorine_max, target_ph_min, target_ph_max')
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

async function maybeCreateAlerts(
  accountDb: SupabaseClient,
  input: {
    companyId: string;
    pool: {
      id: string;
      name?: string | null;
      target_chlorine_min?: number | null;
      target_chlorine_max?: number | null;
      target_ph_min?: number | null;
      target_ph_max?: number | null;
    };
    logId: string;
    freeChlorine: number;
    ph: number;
    photoUrl: string | null;
  },
) {
  const { data: company } = await accountDb
    .from('companies')
    .select('settings')
    .eq('id', input.companyId)
    .maybeSingle();

  const settings = mergeCompanySettings(company?.settings);

  try {
    return await createAlertsForLog(accountDb, {
      companyId: input.companyId,
      poolId: input.pool.id,
      poolName: input.pool.name || 'Pool',
      logId: input.logId,
      freeChlorine: input.freeChlorine,
      ph: input.ph,
      photoUrl: input.photoUrl,
      chlorineMin: input.pool.target_chlorine_min,
      chlorineMax: input.pool.target_chlorine_max,
      phMin: input.pool.target_ph_min,
      phMax: input.pool.target_ph_max,
      settings,
    });
  } catch {
    return [];
  }
}

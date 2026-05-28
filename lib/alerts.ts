import type { SupabaseClient } from '@supabase/supabase-js';
import { mergeCompanySettings } from '@/lib/companySettings';
import { dispatchAlertNotifications } from '@/lib/notifications';

type AlertInput = {
  companyId: string;
  poolId: string;
  poolName: string;
  logId: string;
  freeChlorine: number;
  ph: number;
  photoUrl?: string | null;
  chlorineMin?: number | null;
  chlorineMax?: number | null;
  phMin?: number | null;
  phMax?: number | null;
  settings: ReturnType<typeof mergeCompanySettings>;
};

const isOutOfRange = (input: AlertInput) => {
  const cMin = input.chlorineMin ?? 1;
  const cMax = input.chlorineMax ?? 4;
  const pMin = input.phMin ?? 7.2;
  const pMax = input.phMax ?? 7.8;

  return (
    input.freeChlorine < cMin ||
    input.freeChlorine > cMax ||
    input.ph < pMin ||
    input.ph > pMax
  );
};

export async function createAlertsForLog(
  db: SupabaseClient,
  input: AlertInput,
) {
  const rows: Array<{
    company_id: string;
    pool_id: string;
    chemical_log_id: string;
    severity: string;
    alert_type: string;
    title: string;
    message: string;
    metadata: Record<string, unknown>;
  }> = [];

  if (input.settings.outOfRangeAlerts && isOutOfRange(input)) {
    rows.push({
      company_id: input.companyId,
      pool_id: input.poolId,
      chemical_log_id: input.logId,
      severity: 'critical',
      alert_type: 'out_of_range',
      title: `${input.poolName} is out of range`,
      message: `Chlorine ${input.freeChlorine.toFixed(1)} ppm and pH ${input.ph.toFixed(1)} need manager review.`,
      metadata: {
        free_chlorine: input.freeChlorine,
        ph: input.ph,
      },
    });
  }

  const photoRequired =
    input.settings.requirePhotoEveryTest ||
    (input.settings.requirePhotoOutOfRange && isOutOfRange(input));

  if (photoRequired && !input.photoUrl) {
    rows.push({
      company_id: input.companyId,
      pool_id: input.poolId,
      chemical_log_id: input.logId,
      severity: 'warning',
      alert_type: 'missing_photo',
      title: `${input.poolName} is missing a verification photo`,
      message: 'A photo was required for this chemistry log but none was attached.',
      metadata: {
        free_chlorine: input.freeChlorine,
        ph: input.ph,
      },
    });
  }

  if (!rows.length) return [];

  const { data, error } = await db.from('alerts').insert(rows).select('id, alert_type, title, message, severity');
  if (error) {
    if (error.message.toLowerCase().includes('does not exist')) {
      return [];
    }
    throw new Error(error.message);
  }

  const created = data ?? [];
  if (created.length) {
    void dispatchAlertNotifications(db, {
      companyId: input.companyId,
      alerts: created,
      settings: input.settings,
    }).catch(() => undefined);
  }

  return created;
}

export async function loadCompanyAlerts(
  db: SupabaseClient,
  companyId: string,
  limit = 20,
) {
  const { data, error } = await db
    .from('alerts')
    .select('id, pool_id, chemical_log_id, severity, alert_type, title, message, metadata, read_at, created_at')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    if (error.message.toLowerCase().includes('does not exist')) {
      return [];
    }
    throw new Error(error.message);
  }

  return data ?? [];
}

type PoolSummary = {
  id: string;
  name: string;
};

export async function syncMissedTestAlerts(
  db: SupabaseClient,
  companyId: string,
  pools: PoolSummary[],
  latestLogByPool: Map<string, { created_at: string }>,
  settings: ReturnType<typeof mergeCompanySettings>,
) {
  if (!settings.missedTestAlerts || !pools.length) return [];

  const thresholdMinutes = Math.max(settings.retestReminder || 60, 15);
  const thresholdMs = thresholdMinutes * 60 * 1000;
  const rows: Array<{
    company_id: string;
    pool_id: string;
    chemical_log_id: null;
    severity: string;
    alert_type: string;
    title: string;
    message: string;
    metadata: Record<string, unknown>;
  }> = [];

  for (const pool of pools) {
    const latest = latestLogByPool.get(pool.id);
    const ageMs = latest ? Date.now() - new Date(latest.created_at).getTime() : Number.POSITIVE_INFINITY;
    if (ageMs <= thresholdMs) continue;

    const { data: existing } = await db
      .from('alerts')
      .select('id')
      .eq('company_id', companyId)
      .eq('pool_id', pool.id)
      .eq('alert_type', 'missed_test')
      .is('read_at', null)
      .gte('created_at', new Date(Date.now() - thresholdMs).toISOString())
      .limit(1);

    if (existing?.length) continue;

    rows.push({
      company_id: companyId,
      pool_id: pool.id,
      chemical_log_id: null,
      severity: 'warning',
      alert_type: 'missed_test',
      title: `${pool.name} is overdue for testing`,
      message: `No chemistry log in the last ${thresholdMinutes} minutes.`,
      metadata: { pool_id: pool.id, threshold_minutes: thresholdMinutes },
    });
  }

  if (!rows.length) return [];

  const { data, error } = await db.from('alerts').insert(rows).select('id, alert_type, title, message, severity');
  if (error) {
    if (error.message.toLowerCase().includes('does not exist')) {
      return [];
    }
    throw new Error(error.message);
  }

  const created = data ?? [];
  if (created.length) {
    void dispatchAlertNotifications(db, {
      companyId,
      alerts: created,
      settings,
    }).catch(() => undefined);
  }

  return created;
}

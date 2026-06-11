import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { DEFAULT_OPERATING_TIME_ZONE, getOperatingDayBounds, toOperatingDateInputValue } from '@/lib/operatingDayBounds';

export const dynamic = 'force-dynamic';

const managerRoles = new Set(['admin', 'manager', 'owner', 'boss', 'supervisor']);

const csvEscape = (value: string | number | null | undefined) => {
  const text = value == null ? '' : String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

const getLogStatus = (chlorine: number | null | undefined, ph: number | null | undefined) => {
  if (typeof chlorine !== 'number' || typeof ph !== 'number') return 'legacy';
  if (chlorine < 1 || chlorine > 4 || ph < 7.2 || ph > 7.8) return 'review';
  return 'in-range';
};

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ ok: false, message: 'Unauthorized.' }, { status: 401 });
  }

  const accountDb = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : supabase;
  const { data: account } = await accountDb
    .from('users')
    .select('role, company_id')
    .eq('id', user.id)
    .maybeSingle();

  if (!account?.company_id || !managerRoles.has(String(account.role).toLowerCase())) {
    return NextResponse.json({ ok: false, message: 'Manager access required.' }, { status: 403 });
  }

  const params = request.nextUrl.searchParams;
  const selectedDate = params.get('date') || toOperatingDateInputValue();
  const { start: dayStart, end: dayEnd } = getOperatingDayBounds(selectedDate, DEFAULT_OPERATING_TIME_ZONE);

  const { data: pools } = await accountDb
    .from('pools')
    .select('id, name')
    .eq('company_id', account.company_id)
    .order('name');

  const poolMap = new Map((pools ?? []).map((pool) => [pool.id, pool.name]));
  const poolIds = Array.from(poolMap.keys());

  const { data: logs, error } = poolIds.length
    ? await accountDb
      .from('chemical_logs')
      .select('id, pool_id, submitted_by, free_chlorine, ph, dosing_amount, dosing_unit, dosing_chemical, dosing_recommendation, notes, photo_url, created_at')
      .in('pool_id', poolIds)
      .gte('created_at', dayStart.toISOString())
      .lt('created_at', dayEnd.toISOString())
      .order('created_at', { ascending: false })
    : { data: [], error: null };

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  const submitterIds = Array.from(new Set((logs ?? []).map((log) => log.submitted_by).filter(Boolean))) as string[];
  const { data: submitters } = submitterIds.length
    ? await accountDb.from('users').select('id, full_name, email').in('id', submitterIds)
    : { data: [] };

  const submitterMap = new Map(
    (submitters ?? []).map((profile) => [profile.id, profile.full_name || profile.email || profile.id]),
  );

  const q = params.get('q')?.trim().toLowerCase() ?? '';
  const status = params.get('status')?.trim() ?? '';
  const logger = params.get('logger')?.trim() ?? '';
  const photo = params.get('photo')?.trim() ?? '';

  const filtered = (logs ?? []).filter((log) => {
    const poolName = poolMap.get(log.pool_id) || '';
    if (q && !poolName.toLowerCase().includes(q)) return false;
    if (logger && log.submitted_by !== logger) return false;

    const logStatus = getLogStatus(log.free_chlorine, log.ph);
    if (status === 'in-range' && logStatus !== 'in-range') return false;
    if (status === 'review' && logStatus !== 'review') return false;
    if (status === 'legacy' && logStatus !== 'legacy') return false;
    if (photo === 'missing-photo' && log.photo_url) return false;

    return true;
  });

  const header = ['Time', 'Pool', 'Free Chlorine', 'pH', 'Status', 'Logger', 'Notes', 'Photo URL'];
  const rows = filtered.map((log) => [
    new Date(log.created_at).toLocaleString(),
    poolMap.get(log.pool_id) || log.pool_id,
    typeof log.free_chlorine === 'number' ? `${log.free_chlorine}` : '',
    typeof log.ph === 'number' ? `${log.ph}` : '',
    getLogStatus(log.free_chlorine, log.ph),
    log.submitted_by ? submitterMap.get(log.submitted_by) || log.submitted_by : '',
    log.notes || '',
    log.photo_url || '',
  ]);

  const csv = [header, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="chemdeck-logs-${selectedDate}.csv"`,
    },
  });
}

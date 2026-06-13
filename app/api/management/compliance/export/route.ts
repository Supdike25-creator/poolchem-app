import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const managerRoles = new Set(['admin', 'manager', 'owner', 'boss', 'supervisor']);

const csvEscape = (value: string | number | null | undefined) => {
  const text = value == null ? '' : String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
};

const getComplianceStatus = (
  chlorine: number | null | undefined,
  ph: number | null | undefined,
  cMin: number,
  cMax: number,
  pMin: number,
  pMax: number,
) => {
  if (typeof chlorine !== 'number' || typeof ph !== 'number') return 'incomplete';
  if (chlorine < cMin || chlorine > cMax || ph < pMin || ph > pMax) return 'fail';
  return 'pass';
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

  const db = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : supabase;
  const { data: account } = await db
    .from('users')
    .select('role, company_id')
    .eq('id', user.id)
    .maybeSingle();

  if (!account?.company_id || !managerRoles.has(String(account.role).toLowerCase())) {
    return NextResponse.json({ ok: false, message: 'Manager access required.' }, { status: 403 });
  }

  const params = request.nextUrl.searchParams;
  const startDate = params.get('start') || new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);
  const endDate = params.get('end') || new Date().toISOString().slice(0, 10);
  const dayStart = new Date(`${startDate}T00:00:00`);
  const dayEnd = new Date(`${endDate}T00:00:00`);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const { data: pools } = await db
    .from('pools')
    .select('id, name, target_chlorine_min, target_chlorine_max, target_ph_min, target_ph_max')
    .eq('company_id', account.company_id)
    .order('name');

  const poolMap = new Map((pools ?? []).map((pool) => [pool.id, pool]));
  const poolIds = Array.from(poolMap.keys());

  const { data: logs, error } = poolIds.length
    ? await db
      .from('chemical_logs')
      .select('id, pool_id, submitted_by, free_chlorine, ph, notes, photo_url, created_at')
      .in('pool_id', poolIds)
      .gte('created_at', dayStart.toISOString())
      .lt('created_at', dayEnd.toISOString())
      .order('created_at', { ascending: true })
    : { data: [], error: null };

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  const submitterIds = Array.from(new Set((logs ?? []).map((log) => log.submitted_by).filter(Boolean))) as string[];
  const { data: submitters } = submitterIds.length
    ? await db.from('users').select('id, full_name, email').in('id', submitterIds)
    : { data: [] };

  const submitterMap = new Map(
    (submitters ?? []).map((profile) => [profile.id, profile.full_name || profile.email || profile.id]),
  );

  const header = [
    'Date',
    'Time',
    'Pool',
    'Free Chlorine (ppm)',
    'pH',
    'Compliance',
    'Logger',
    'Photo Attached',
    'Notes',
  ];

  const rows = (logs ?? []).map((log) => {
    const pool = poolMap.get(log.pool_id);
    const created = new Date(log.created_at);
    const status = getComplianceStatus(
      log.free_chlorine,
      log.ph,
      pool?.target_chlorine_min ?? 1,
      pool?.target_chlorine_max ?? 4,
      pool?.target_ph_min ?? 7.2,
      pool?.target_ph_max ?? 7.8,
    );

    return [
      created.toLocaleDateString(),
      created.toLocaleTimeString(),
      pool?.name || log.pool_id,
      typeof log.free_chlorine === 'number' ? log.free_chlorine.toFixed(1) : '',
      typeof log.ph === 'number' ? log.ph.toFixed(1) : '',
      status,
      log.submitted_by ? submitterMap.get(log.submitted_by) || log.submitted_by : '',
      log.photo_url ? 'yes' : 'no',
      log.notes || '',
    ];
  });

  const passCount = rows.filter((row) => row[5] === 'pass').length;
  const failCount = rows.filter((row) => row[5] === 'fail').length;

  const summary = [
    [],
    ['Summary'],
    ['Report Start', startDate],
    ['Report End', endDate],
    ['Total Logs', String(rows.length)],
    ['Pass', String(passCount)],
    ['Fail', String(failCount)],
  ];

  const csv = [header, ...rows, ...summary].map((row) => row.map(csvEscape).join(',')).join('\n');

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="chemdeck-compliance-${startDate}-to-${endDate}.csv"`,
    },
  });
}

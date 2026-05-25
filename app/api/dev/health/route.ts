import { NextRequest, NextResponse } from 'next/server';
import { assertDevRequest, getDevCompanyId, getAdminOrError, logDevMessage, logDevRequest, optionalDevTableNames, readDevTables } from '@/lib/devTools';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const forbidden = assertDevRequest(request);
  if (forbidden) return forbidden;

  const { supabase, error: adminError } = getAdminOrError();
  if (!supabase) {
    await logDevRequest({ method: 'GET', path: '/api/dev/health', status: 500, message: adminError ?? undefined });
    return NextResponse.json({ ok: false, message: adminError }, { status: 500 });
  }

  const companyId = await getDevCompanyId(request);
  const [usersCheck, poolsCheck, logsCheck] = await Promise.all([
    supabase.from('users').select('id', { count: 'exact', head: true }),
    companyId
      ? supabase.from('pools').select('id', { count: 'exact', head: true }).eq('company_id', companyId)
      : supabase.from('pools').select('id', { count: 'exact', head: true }),
    supabase.from('chemical_logs').select('id', { count: 'exact', head: true }),
  ]);
  const tables = await readDevTables();
  const routeErrors = [usersCheck.error, poolsCheck.error, logsCheck.error].filter(Boolean);
  const brokenTables = tables.filter(
    (table) =>
      table.status === 'error' || (table.status === 'missing' && !optionalDevTableNames.has(table.name)),
  );
  const status = brokenTables.length || routeErrors.length ? 207 : 200;

  await logDevRequest({ method: 'GET', path: '/api/dev/health', status });
  await logDevMessage('api', brokenTables.length ? 'Health check completed with table errors.' : 'Health check completed successfully.', { brokenTables });

  return NextResponse.json({
    ok: brokenTables.length === 0 && routeErrors.length === 0,
    message: brokenTables.length || routeErrors.length ? 'API reachable, some database checks failed.' : 'API and database checks passed.',
    details: {
      selected_company_id: companyId,
      database: brokenTables.length || routeErrors.length ? 'degraded' : 'connected',
      counts: {
        users: usersCheck.count ?? 0,
        pools: poolsCheck.count ?? 0,
        chemical_logs: logsCheck.count ?? 0,
      },
      tables,
    },
  }, { status });
}

import { NextRequest, NextResponse } from 'next/server';
import { assertDevRequest, getAdminOrError, logDevMessage, logDevRequest, readDevTables } from '@/lib/devTools';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const forbidden = assertDevRequest(request);
  if (forbidden) return forbidden;

  const { supabase, error: adminError } = getAdminOrError();
  if (!supabase) {
    await logDevRequest({ method: 'GET', path: '/api/dev/health', status: 500, message: adminError ?? undefined });
    return NextResponse.json({ ok: false, message: adminError }, { status: 500 });
  }

  const tables = await readDevTables();
  const brokenTables = tables.filter((table) => table.status !== 'ok');
  const status = brokenTables.length ? 207 : 200;

  await logDevRequest({ method: 'GET', path: '/api/dev/health', status });
  await logDevMessage('api', brokenTables.length ? 'Health check completed with table errors.' : 'Health check completed successfully.', { brokenTables });

  return NextResponse.json({
    ok: brokenTables.length === 0,
    message: brokenTables.length ? 'API reachable, some database checks failed.' : 'API and database checks passed.',
    details: {
      database: brokenTables.length ? 'degraded' : 'connected',
      tables,
    },
  }, { status });
}

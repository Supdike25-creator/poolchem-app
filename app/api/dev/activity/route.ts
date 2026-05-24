import { NextRequest, NextResponse } from 'next/server';
import { assertDevRequest, readDevApiRequests, readDevRawLogs, readFeatureFlags, logDevRequest } from '@/lib/devTools';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const forbidden = assertDevRequest(request);
  if (forbidden) return forbidden;

  const [flags, logs, requests] = await Promise.all([
    readFeatureFlags(),
    readDevRawLogs(),
    readDevApiRequests(),
  ]);

  await logDevRequest({ method: 'GET', path: '/api/dev/activity', status: 200 });

  return NextResponse.json({
    ok: true,
    message: 'Dev activity loaded.',
    flags,
    logs,
    requests,
  });
}

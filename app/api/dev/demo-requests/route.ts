import { NextRequest, NextResponse } from 'next/server';
import { assertDevRequest } from '@/lib/devTools';
import { readDemoRequests } from '@/lib/demoRequests';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const forbidden = assertDevRequest(request);
  if (forbidden) return forbidden;

  const requests = await readDemoRequests(30);
  return NextResponse.json({ ok: true, requests });
}

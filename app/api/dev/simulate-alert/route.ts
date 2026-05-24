import { NextRequest, NextResponse } from 'next/server';
import { isDevRequest } from '@/lib/auth/devSession';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (!isDevRequest(request)) {
    return NextResponse.json({ ok: false, message: 'Dev session required.' }, { status: 403 });
  }

  return NextResponse.json(
    {
      ok: true,
      message: 'Simulated alert accepted.',
      details: {
        severity: 'warning',
        type: 'chemistry_range',
        pool: 'Demo Pool',
        freeChlorine: 0.6,
        ph: 8.1,
      },
    },
    { status: 202 },
  );
}

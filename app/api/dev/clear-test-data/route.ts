import { NextRequest, NextResponse } from 'next/server';
import { isDevRequest } from '@/lib/auth/devSession';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (!isDevRequest(request)) {
    return NextResponse.json({ ok: false, message: 'Dev session required.' }, { status: 403 });
  }

  return NextResponse.json({
    ok: true,
    message: 'Clear test data completed for dev-safe mock data.',
    details: {
      deletedRows: 0,
      mode: 'dry-run',
    },
  });
}

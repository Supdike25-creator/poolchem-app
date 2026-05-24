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
      message: 'Test chem log validated.',
      details: {
        pool: 'Demo Pool',
        freeChlorine: 2.4,
        ph: 7.5,
        submittedBy: 'ChemDeckDev',
        persisted: false,
      },
    },
    { status: 201 },
  );
}

import { NextRequest, NextResponse } from 'next/server';
import { isDevRequest } from '@/lib/auth/devSession';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!isDevRequest(request)) {
    return NextResponse.json({ ok: false, message: 'Dev session required.' }, { status: 403 });
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.from('profiles').select('id', { head: true, count: 'exact' });

    return NextResponse.json({
      ok: !error,
      message: error ? 'API reachable, database degraded.' : 'API and database are reachable.',
      details: {
        database: error ? 'degraded' : 'connected',
        error: error?.message ?? null,
      },
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      message: 'API reachable, database unavailable.',
      details: { error: (error as Error).message },
    });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getDevSessionFromRequest } from '@/lib/auth/devSession';
import { loadDevCompanySummary } from '@/lib/devCompanySummary';

export const dynamic = 'force-dynamic';

const assertDevAccess = async (request: NextRequest) => {
  if (getDevSessionFromRequest(request)) return null;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: false, message: 'Dev session required.' }, { status: 403 });
    }

    const admin = createAdminClient();
    const { data: account } = await admin.from('users').select('role').eq('id', user.id).maybeSingle();
    if (String(account?.role ?? '').toLowerCase() !== 'dev') {
      return NextResponse.json({ ok: false, message: 'Dev session required.' }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ ok: false, message: 'Dev session required.' }, { status: 403 });
  }

  return null;
};

export async function GET(request: NextRequest) {
  const forbidden = await assertDevAccess(request);
  if (forbidden) return forbidden;

  const companyId = request.nextUrl.searchParams.get('companyId')?.trim();
  if (!companyId) {
    return NextResponse.json({ ok: false, message: 'companyId is required.' }, { status: 400 });
  }

  try {
    const summary = await loadDevCompanySummary(companyId);
    if (!summary) {
      return NextResponse.json({ ok: false, message: 'Company not found.' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : 'Unable to load company summary.' },
      { status: 500 },
    );
  }
}

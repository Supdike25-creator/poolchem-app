import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { listUserCompanyMemberships, setActiveCompany } from '@/lib/companyMemberships';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, message: 'Sign in required.' }, { status: 401 });
  }

  const db = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : supabase;
  const { data: account } = await db.from('users').select('company_id, role').eq('id', user.id).maybeSingle();

  try {
    const memberships = await listUserCompanyMemberships(db, user.id, account?.company_id ?? null);
    return NextResponse.json({
      ok: true,
      active_company_id: account?.company_id ?? null,
      memberships,
    });
  } catch (error) {
    return NextResponse.json({ ok: false, message: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, message: 'Sign in required.' }, { status: 401 });
  }

  const body = await request.json().catch(() => null) as { company_id?: string } | null;
  const companyId = body?.company_id?.trim();

  if (!companyId) {
    return NextResponse.json({ ok: false, message: 'Select a company.' }, { status: 400 });
  }

  const db = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : supabase;

  try {
    const result = await setActiveCompany(db, user.id, companyId);
    if (!result.ok) {
      return NextResponse.json(result, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ ok: false, message: (error as Error).message }, { status: 500 });
  }
}

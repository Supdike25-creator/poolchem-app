import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { mergeCompanySettings, type CompanySettings } from '@/lib/companySettings';

export const dynamic = 'force-dynamic';

const managerRoles = new Set(['boss', 'manager', 'admin', 'supervisor', 'owner']);

const getSessionContext = async () => {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { error: NextResponse.json({ ok: false, message: 'Unauthorized.' }, { status: 401 }) };
  }

  const accountDb = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : supabase;
  const { data: account } = await accountDb
    .from('users')
    .select('id, role, company_id')
    .eq('id', user.id)
    .maybeSingle();

  const companyId = account?.company_id ?? null;
  if (!companyId) {
    return { error: NextResponse.json({ ok: false, message: 'Join a company before loading settings.' }, { status: 400 }) };
  }

  return {
    user,
    companyId,
    role: account?.role ?? '',
    accountDb,
  };
};

export async function GET() {
  const context = await getSessionContext();
  if ('error' in context && context.error) return context.error;

  const { companyId, accountDb } = context;
  const { data, error } = await accountDb
    .from('companies')
    .select('id, company_name, company_code, settings')
    .eq('id', companyId)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ ok: false, message: error?.message || 'Company not found.' }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    company: {
      id: data.id,
      company_name: data.company_name,
      company_code: data.company_code,
    },
    settings: mergeCompanySettings(data.settings),
  });
}

export async function PATCH(request: NextRequest) {
  const context = await getSessionContext();
  if ('error' in context && context.error) return context.error;

  const { companyId, role, accountDb } = context;
  if (!managerRoles.has(String(role).toLowerCase())) {
    return NextResponse.json({ ok: false, message: 'Only managers can update workspace settings.' }, { status: 403 });
  }

  const body = await request.json().catch(() => null) as Partial<CompanySettings> | null;
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ ok: false, message: 'Invalid settings payload.' }, { status: 400 });
  }

  const { data: existing, error: readError } = await accountDb
    .from('companies')
    .select('settings')
    .eq('id', companyId)
    .maybeSingle();

  if (readError || !existing) {
    return NextResponse.json({ ok: false, message: readError?.message || 'Company not found.' }, { status: 404 });
  }

  const merged = mergeCompanySettings({ ...mergeCompanySettings(existing.settings), ...body });
  const { error: updateError } = await accountDb
    .from('companies')
    .update({ settings: merged })
    .eq('id', companyId);

  if (updateError) {
    return NextResponse.json({ ok: false, message: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, settings: merged });
}

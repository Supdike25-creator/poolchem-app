import { NextResponse, type NextRequest } from 'next/server';
import { isDevRequest, getDevSessionFromRequest } from '@/lib/auth/devSession';
import { resolveDevCompanyId } from '@/lib/devTools';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/utils/supabase/server';

type AccountRow = {
  id: string;
  role?: string | null;
  company_id?: string | null;
  full_name?: string | null;
  email?: string | null;
};

export type ApiCompanyScope = {
  companyId: string;
  userId: string | null;
  account: AccountRow | null;
  accountDb: ReturnType<typeof createAdminClient> | Awaited<ReturnType<typeof createClient>>;
  isDevPreview: boolean;
};

type ScopeSuccess = { ok: true; scope: ApiCompanyScope };
type ScopeFailure = { ok: false; response: NextResponse };

export async function resolveApiCompanyScope(request?: NextRequest): Promise<ScopeSuccess | ScopeFailure> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  const adminClient = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : null;
  const accountDb = adminClient ?? supabase;

  const rawDevCompanyId = request && isDevRequest(request)
    ? request.nextUrl.searchParams.get('companyId')
    : null;

  const devCompanyId = rawDevCompanyId && adminClient
    ? await resolveDevCompanyId(adminClient, rawDevCompanyId)
    : rawDevCompanyId;

  if ((userError || !user) && !devCompanyId) {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, message: 'Unauthorized.' }, { status: 401 }),
    };
  }

  let account: AccountRow | null = null;
  if (user) {
    const { data } = await accountDb
      .from('users')
      .select('id, role, company_id, full_name, email')
      .eq('id', user.id)
      .maybeSingle();
    account = data;
  }

  const companyId = devCompanyId ?? account?.company_id ?? null;
  if (!companyId) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, message: 'Join a company before accessing this workspace.' },
        { status: 400 },
      ),
    };
  }

  const devSession = request ? getDevSessionFromRequest(request) : null;
  const userId = user?.id ?? devSession?.id ?? null;

  return {
    ok: true,
    scope: {
      companyId,
      userId,
      account,
      accountDb,
      isDevPreview: Boolean(devCompanyId),
    },
  };
}

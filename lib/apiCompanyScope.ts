import { NextResponse, type NextRequest } from 'next/server';
import { isDevRequest, getDevSessionFromRequest } from '@/lib/auth/devSession';
import { getAppSessionFromRequest } from '@/lib/auth/appSession';
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

const readDevCompanyIdFromBody = async (request: NextRequest) => {
  if (request.method === 'GET' || request.method === 'HEAD') {
    return null;
  }

  try {
    const body = (await request.clone().json()) as { companyId?: string | null } | null;
    return body?.companyId?.trim() || null;
  } catch {
    return null;
  }
};

export async function resolveApiCompanyScope(request?: NextRequest): Promise<ScopeSuccess | ScopeFailure> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  const adminClient = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : null;
  const accountDb = adminClient ?? supabase;

  const rawDevCompanyId = request && isDevRequest(request)
    ? request.nextUrl.searchParams.get('companyId') ?? (await readDevCompanyIdFromBody(request))
    : null;

  const devCompanyId = rawDevCompanyId && adminClient
    ? await resolveDevCompanyId(adminClient, rawDevCompanyId)
    : rawDevCompanyId;

  const appSession = request ? getAppSessionFromRequest(request) : null;

  let account: AccountRow | null = null;
  if (user) {
    const { data } = await accountDb
      .from('users')
      .select('id, role, company_id, full_name, email')
      .eq('id', user.id)
      .maybeSingle();
    account = data;
  } else if (appSession?.id && adminClient) {
    const { data: appAccount } = await accountDb
      .from('app_accounts')
      .select('id, role, company_id, name, email')
      .eq('id', appSession.id)
      .maybeSingle();

    if (appAccount) {
      account = {
        id: appAccount.id,
        role: appAccount.role,
        company_id: appAccount.company_id,
        full_name: appAccount.name,
        email: appAccount.email,
      };
    }
  }

  const companyId = devCompanyId ?? account?.company_id ?? null;

  if ((userError || !user) && !devCompanyId && !appSession) {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, message: 'Unauthorized.' }, { status: 401 }),
    };
  }

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
  const userId = user?.id ?? devSession?.id ?? appSession?.id ?? null;

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

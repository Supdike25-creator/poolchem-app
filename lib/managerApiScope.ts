import { NextRequest, NextResponse } from 'next/server';
import { resolveApiCompanyScope } from '@/lib/apiCompanyScope';

export const dynamic = 'force-dynamic';

export type ManagerApiScope = {
  companyId: string;
  userId: string | null;
  accountDb: Exclude<Awaited<ReturnType<typeof resolveApiCompanyScope>>, { ok: false }>['scope']['accountDb'];
  isDevPreview: boolean;
  inviterName: string;
  account: {
    id?: string;
    role?: string | null;
    company_id?: string | null;
    full_name?: string | null;
    email?: string | null;
  } | null;
};

type ScopeSuccess = { ok: true; scope: ManagerApiScope };
type ScopeFailure = { ok: false; response: NextResponse };

const managerRoles = new Set(['boss', 'manager', 'admin', 'supervisor', 'owner']);

export async function resolveManagerApiScope(request: NextRequest): Promise<ScopeSuccess | ScopeFailure> {
  const context = await resolveApiCompanyScope(request);
  if (!context.ok) {
    return { ok: false, response: context.response };
  }

  const { scope } = context;

  if (scope.isDevPreview) {
    return {
      ok: true,
      scope: {
        companyId: scope.companyId,
        userId: scope.userId,
        accountDb: scope.accountDb,
        isDevPreview: true,
        inviterName: 'ChemDeck Dev',
        account: scope.account,
      },
    };
  }

  const role = String(scope.account?.role ?? '').toLowerCase();
  if (!managerRoles.has(role)) {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, message: 'Manager access required.' }, { status: 403 }),
    };
  }

  return {
    ok: true,
    scope: {
      companyId: scope.companyId,
      userId: scope.userId,
      accountDb: scope.accountDb,
      isDevPreview: false,
      inviterName: scope.account?.full_name || scope.account?.email || 'Your manager',
      account: scope.account,
    },
  };
}

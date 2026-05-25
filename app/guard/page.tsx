import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { loadGuardPools } from '@/lib/guardPools';
import { temporaryLoginBypass } from '../../lib/temporaryLoginBypass';
import BackButton from '../../components/BackButton';

export const dynamic = 'force-dynamic';

export default async function GuardHomePage({ devCompanyId }: { devCompanyId?: string } = {}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let poolList: Array<{
    id: string;
    name: string;
    pool_type?: string | null;
    volume_gallons?: number | null;
  }> = [];
  let poolErrorMessage = '';

  if (user || devCompanyId) {
    const db = devCompanyId || process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : supabase;
    let companyId = devCompanyId || null;
    let guardId: string | null = null;
    let guardRole: string | null = null;

    if (!companyId && user) {
      const { data: account, error: accountError } = await db
        .from('users')
        .select('company_id, role, id')
        .eq('id', user.id)
        .maybeSingle<{ company_id: string | null; role?: string | null; id: string }>();

      if (accountError) {
        poolErrorMessage = accountError.message;
      } else {
        companyId = account?.company_id ?? null;
        guardId = account?.id ?? null;
        guardRole = account?.role ?? null;
      }
    }

    if (companyId) {
      try {
        poolList = await loadGuardPools(db, {
          companyId,
          guardId,
          guardRole,
          devPreview: Boolean(devCompanyId),
          select: 'id,name,pool_type,volume_gallons',
        });
      } catch (error) {
        poolErrorMessage = error instanceof Error ? error.message : 'Unable to load pools.';
      }
    }
  }

  if (poolErrorMessage && !temporaryLoginBypass) {
    throw new Error(`Unable to load pools: ${poolErrorMessage}`);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm text-slate-500 uppercase tracking-wide">Guard</p>
            <h1 className="text-2xl font-semibold text-slate-900">Guard Workbench</h1>
            <p className="mt-2 text-sm text-slate-600 max-w-2xl">Select your assigned pool and submit a daily chemistry log.</p>
          </div>
          <BackButton fallbackHref="/" label="Back" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 mb-6">
          <Link
            href={devCompanyId ? `/guard/log?companyId=${encodeURIComponent(devCompanyId)}` : '/guard/log'}
            className="rounded-xl border border-blue-200 bg-white p-5 text-left shadow-sm transition hover:border-blue-300 hover:shadow-md"
          >
            <p className="text-sm font-semibold text-blue-700">Start a New Log</p>
            <p className="mt-3 text-slate-700">Begin the guard log workflow for a pool and submit your findings.</p>
          </Link>
          <Link
            href={devCompanyId ? `/guard/review?companyId=${encodeURIComponent(devCompanyId)}` : '/guard/review'}
            className="rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-slate-300 hover:shadow-md"
          >
            <p className="text-sm font-semibold text-slate-700">Review Completed Logs</p>
            <p className="mt-3 text-slate-700">Review your submitted chemistry logs and confirm action items.</p>
          </Link>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Assigned Pools</h2>
          <p className="mt-2 text-slate-600">Choose the pool you are logging for today.</p>
          {temporaryLoginBypass && poolErrorMessage ? (
            <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
              Login bypass is active, so live Supabase pool data may be hidden until the auth work is finished.
            </div>
          ) : null}
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {poolList.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-slate-600">No pool assignments configured yet.</div>
            ) : (
              poolList.map((pool) => (
                <Link
                  key={pool.id}
                  href={`/guard/log?poolId=${pool.id}${devCompanyId ? `&companyId=${encodeURIComponent(devCompanyId)}` : ''}`}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm transition hover:border-blue-300 hover:bg-white"
                >
                  <p className="text-lg font-semibold text-slate-900">{pool.name}</p>
                  <p className="mt-1 text-sm text-slate-600">{pool.pool_type || 'Pool'} • {pool.volume_gallons ? `${pool.volume_gallons} gal` : 'Volume not set'}</p>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import Link from 'next/link';
import { getSupabaseClient } from '../../../lib/supabaseClient';

interface Pool {
  id: string;
  name: string;
}

export const dynamic = 'force-dynamic';

export default async function GuardReviewPage({ searchParams }: { searchParams: { poolId?: string; chlorine?: string; ph?: string } }) {
  const supabase = getSupabaseClient();
  let pool: Pool | null = null;

  if (searchParams.poolId) {
    const { data, error } = await supabase.from('pools').select('id,name').eq('id', searchParams.poolId).single();
    if (!error && data) {
      pool = data;
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm text-slate-500 uppercase tracking-wide">Guard</p>
            <h1 className="text-3xl font-semibold text-slate-900">Review Log</h1>
            <p className="mt-2 text-slate-600 max-w-2xl">Confirm submitted chemistry values and view guidance for your next step.</p>
          </div>
          <Link
            href="/guard"
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Guard Home
          </Link>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-6">
            <div>
              <p className="text-sm font-medium text-slate-700">Pool</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{pool?.name ?? 'Pool not selected'}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Free Chlorine</p>
                <p className="mt-3 text-3xl font-semibold text-slate-900">{searchParams.chlorine ? `${searchParams.chlorine} ppm` : 'N/A'}</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">pH</p>
                <p className="mt-3 text-3xl font-semibold text-slate-900">{searchParams.ph ?? 'N/A'}</p>
              </div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Next step</p>
              <p className="mt-3 text-slate-700">
                {searchParams.chlorine && searchParams.ph
                  ? 'If the log is complete, submit the record and continue to the next assigned pool. Use guard log review to confirm you followed management targets.'
                  : 'Submit a guard log first to review results here.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

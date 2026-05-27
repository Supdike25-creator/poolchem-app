'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { getStoredSession } from '@/lib/appAccounts';
import { useDevCompanyScope } from '@/lib/useDevCompanyScope';
import BackButton from '../../../../components/BackButton';
import { buttonClass } from '../../../../components/OperationsUI';
import { CalendarClock, ClipboardList, Clock3, Pencil } from 'lucide-react';

interface PoolData {
  id: string;
  name: string;
  pool_type?: string | null;
}

interface PoolHistoryLog {
  id: string;
  free_chlorine?: number | null;
  ph?: number | null;
  dosing_recommendation?: string | null;
  created_at: string;
}

export default function PoolHistoryPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const { companyId, query } = useDevCompanyScope();
  const poolsHref = `/management/pools${query}`;
  const [pool, setPool] = useState<PoolData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<PoolHistoryLog[]>([]);

  useEffect(() => {
    if (!id) {
      router.push(poolsHref);
      return;
    }

    const loadPool = async () => {
      setLoading(true);
      setError('');
      const devSession = getStoredSession()?.role === 'dev';

      if (devSession || companyId) {
        if (!companyId && devSession) {
          setError('Select a company from Dev Dashboard before viewing pool history.');
          setLoading(false);
          return;
        }

        const response = await fetch(`/api/management/pools/${id}/history${query}`, {
          cache: 'no-store',
          credentials: 'same-origin',
        });
        const result = await response.json().catch(() => null);

        if (!response.ok || !result?.ok) {
          setError(result?.message || 'Unable to load pool history.');
          setLoading(false);
          return;
        }

        setPool(result.pool as PoolData);
        setHistory((result.logs ?? []) as PoolHistoryLog[]);
        setLoading(false);
        return;
      }

      const supabase = createClient();
      const { data, error: loadError } = await supabase.from('pools').select('id, name, pool_type').eq('id', id).single();

      if (loadError) {
        setError(loadError.message);
        setLoading(false);
        return;
      }

      setPool(data);

      const { data: logs } = await supabase
        .from('chemical_logs')
        .select('id,free_chlorine,ph,dosing_recommendation,created_at')
        .eq('pool_id', id)
        .order('created_at', { ascending: false })
        .limit(8);

      setHistory((logs || []) as PoolHistoryLog[]);
      setLoading(false);
    };

    void loadPool();
  }, [id, router, companyId, query, poolsHref]);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Management</p>
          <h1 className="text-2xl font-bold text-slate-900">{pool?.name || 'Pool History'}</h1>
          <p className="mt-2 text-sm text-slate-600">Recent chemistry timeline and quick pool actions.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/management/pools/${id}/schedule${query}`} className={buttonClass.secondary}>
            <CalendarClock className="mr-2 h-4 w-4" />
            Hours & Calendar
          </Link>
          <Link href={`/management/pools/${id}/edit${query}`} className={buttonClass.secondary}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit Pool
          </Link>
          <BackButton fallbackHref={poolsHref} label="Back" />
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600">Loading pool history...</div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">{error}</div>
      ) : !pool ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600">Pool not found.</div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700">
              <ClipboardList className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-950">Pool History</h2>
              <p className="text-sm text-slate-500">{pool.pool_type || 'General pool'}</p>
            </div>
          </div>
          {history.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
              <Clock3 className="mx-auto mb-3 h-6 w-6 text-slate-400" />
              <p className="text-sm font-semibold text-slate-950">No history yet.</p>
              <p className="mt-1 text-sm text-slate-500">Once guards submit chemical tests, they&apos;ll appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((log) => {
                const date = new Date(log.created_at);
                const status =
                  typeof log.free_chlorine === 'number'
                  && typeof log.ph === 'number'
                  && log.free_chlorine >= 1
                  && log.free_chlorine <= 4
                  && log.ph >= 7.2
                  && log.ph <= 7.8
                    ? 'Good'
                    : 'Needs review';

                return (
                  <div key={log.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">
                          {date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} — Test submitted
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          Cl {typeof log.free_chlorine === 'number' ? `${log.free_chlorine.toFixed(1)} ppm` : 'Not recorded'}
                          {' '}| pH {typeof log.ph === 'number' ? log.ph.toFixed(1) : 'Not recorded'} | {status}
                        </p>
                        {log.dosing_recommendation ? (
                          <p className="mt-1 text-xs font-medium text-blue-700">{log.dosing_recommendation}</p>
                        ) : null}
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {date.toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

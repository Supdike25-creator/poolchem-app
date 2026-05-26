'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { getStoredSession } from '@/lib/appAccounts';
import { useDevCompanyScope } from '@/lib/useDevCompanyScope';
import { EmptyState, PageHeader, SectionCard, StatusBadge, buttonClass } from '../../../components/OperationsUI';
import { ClipboardList, Pencil, Plus, SlidersHorizontal, Waves } from 'lucide-react';

interface Pool {
  id: string;
  name: string;
  pool_type?: string | null;
  volume_gallons?: number | null;
}

export default function ManagementPoolsView() {
  const { companyId, query } = useDevCompanyScope();
  const [poolList, setPoolList] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const loadPools = async () => {
      setLoading(true);
      setError('');

      const devSession = getStoredSession()?.role === 'dev';

      if (devSession || companyId) {
        if (!companyId) {
          if (active) {
            setPoolList([]);
            setError('Select a company from Dev Dashboard before managing pools.');
            setLoading(false);
          }
          return;
        }

        try {
          const response = await fetch(`/api/company-pools${query}`, {
            cache: 'no-store',
            credentials: 'same-origin',
          });
          const result = await response.json().catch(() => null);

          if (!active) return;

          if (!response.ok || !result?.ok) {
            setPoolList([]);
            setError(result?.message || 'Unable to load pools.');
            return;
          }

          setPoolList(result.pools ?? []);
        } catch {
          if (active) {
            setPoolList([]);
            setError('Network error while loading pools.');
          }
        } finally {
          if (active) setLoading(false);
        }
        return;
      }

      const supabase = createClient();
      const { data, error: poolsError } = await supabase
        .from('pools')
        .select('id,name,pool_type,volume_gallons')
        .order('name');

      if (!active) return;

      if (poolsError) {
        setPoolList([]);
        setError(poolsError.message);
      } else {
        setPoolList(data ?? []);
      }

      setLoading(false);
    };

    void loadPools();

    const refresh = () => {
      void loadPools();
    };

    window.addEventListener('focus', refresh);
    window.addEventListener('chemdeck-dev-company-change', refresh);

    return () => {
      active = false;
      window.removeEventListener('focus', refresh);
      window.removeEventListener('chemdeck-dev-company-change', refresh);
    };
  }, [companyId, query]);

  const newPoolHref = `/management/pools/new${query}`;
  const withCompany = (path: string) => `${path}${query}`;

  return (
    <div>
      <PageHeader
        eyebrow="Management"
        title="Pool Configuration"
        description="Create and update managed pools, chemistry targets, and dosing rules."
        icon={<SlidersHorizontal className="h-4 w-4" />}
        actions={(
          <Link href={newPoolHref} className={buttonClass.primary}>
            <Plus className="mr-2 h-4 w-4" />
            Add Pool
          </Link>
        )}
      />

      {error ? (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
          Loading pools...
        </div>
      ) : null}

      {!loading && poolList.length > 0 ? (
        <div className="mb-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-slate-950">Pool Card View</h2>
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
              <span className="rounded-md bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white">Card View</span>
              <span className="px-3 py-1.5 text-xs font-semibold text-slate-500">Table View</span>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {poolList.map((pool) => (
              <SectionCard key={pool.id} className="p-5">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-slate-950">{pool.name}</h3>
                    <p className="mt-1 text-sm text-slate-500">{pool.pool_type || 'General pool'}</p>
                  </div>
                  <StatusBadge tone="neutral">No Data</StatusBadge>
                </div>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-slate-50 p-3">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Volume</dt>
                    <dd className="mt-1 font-semibold text-slate-900">{pool.volume_gallons ? `${pool.volume_gallons.toLocaleString()} gal` : 'Unknown'}</dd>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Last Test</dt>
                    <dd className="mt-1 font-semibold text-slate-900">Not recorded</dd>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Next Due</dt>
                    <dd className="mt-1 font-semibold text-slate-900">Start today</dd>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</dt>
                    <dd className="mt-1"><StatusBadge tone="neutral">Configured</StatusBadge></dd>
                  </div>
                </dl>
                <div className="mt-4 flex gap-2">
                  <Link href={withCompany(`/log?poolId=${pool.id}`)} className={buttonClass.primary}>
                    <ClipboardList className="mr-2 h-4 w-4" />
                    Log Test
                  </Link>
                  <Link href={withCompany(`/management/pools/${pool.id}`)} className={buttonClass.secondary}>
                    <Pencil className="mr-2 h-4 w-4" />
                    View History
                  </Link>
                </div>
              </SectionCard>
            ))}
          </div>
        </div>
      ) : null}

      <SectionCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Pool Name</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Type</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Volume</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {!loading && poolList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8">
                    <EmptyState
                      icon={<Waves className="h-6 w-6" />}
                      title="No pools configured"
                      description="Create a pool to begin assigning tests and tracking chemistry status."
                      action={<Link href={newPoolHref} className={buttonClass.primary}>Add Pool</Link>}
                    />
                  </td>
                </tr>
              ) : (
                poolList.map((pool) => (
                  <tr key={pool.id} className="hover:bg-slate-50 transition-colors duration-150">
                    <td className="px-6 py-4 text-sm font-semibold text-slate-950">{pool.name}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{pool.pool_type || 'General'}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{pool.volume_gallons ? `${pool.volume_gallons} gal` : 'Unknown'}</td>
                    <td className="px-6 py-4 text-sm"><StatusBadge tone="neutral">Configured</StatusBadge></td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      <Link href={withCompany(`/management/pools/${pool.id}/edit`)} className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:text-blue-900 transition-colors">
                        <Pencil className="h-4 w-4" />
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}

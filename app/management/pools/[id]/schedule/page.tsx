'use client';

import { useEffect, useState } from 'react';
import BackButton from '@/components/BackButton';
import { PageHeader } from '@/components/OperationsUI';
import PoolScheduleEditor from '@/components/pools/PoolScheduleEditor';
import { useDevCompanyScope } from '@/lib/useDevCompanyScope';
import { CalendarClock } from 'lucide-react';

export default function PoolSchedulePage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { query } = useDevCompanyScope();
  const poolsHref = `/management/pools${query}`;
  const [poolName, setPoolName] = useState('Pool');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/management/pools/${id}${query}`, {
          cache: 'no-store',
          credentials: 'same-origin',
        });
        const result = await response.json().catch(() => null);

        if (!response.ok || !result?.ok) {
          setError(result?.message || 'Unable to load pool.');
          return;
        }

        setPoolName(result.pool.name || 'Pool');
      } catch {
        setError('Network error while loading pool.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [id, query]);

  return (
    <div>
      <PageHeader
        eyebrow="Management"
        title={`${poolName} — Hours & Calendar`}
        description="Set weekly operating hours and override specific days for holidays, parties, or extended hours."
        icon={<CalendarClock className="h-4 w-4" />}
        actions={<BackButton fallbackHref={poolsHref} label="Back to pools" />}
      />

      {error ? (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>
      ) : null}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
          Loading pool schedule…
        </div>
      ) : (
        <PoolScheduleEditor poolId={id} poolName={poolName} query={query} />
      )}
    </div>
  );
}

import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { temporaryLoginBypass } from '../../../lib/temporaryLoginBypass';
import { EmptyState, PageHeader, SectionCard, StatusBadge, buttonClass } from '../../../components/OperationsUI';
import { Pencil, Plus, SlidersHorizontal, Waves } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface Pool {
  id: string;
  name: string;
  pool_type?: string | null;
  volume_gallons?: number | null;
}

export default async function ManagementPoolsPage() {
  const supabase = await createClient();
  const { data: pools, error } = await supabase
    .from('pools')
    .select('id,name,pool_type,volume_gallons')
    .order('name');

  if (error && !temporaryLoginBypass) {
    throw new Error(`Unable to fetch pools: ${error.message}`);
  }

  const poolList: Pool[] = error ? [] : pools ?? [];

  return (
    <div>
      <PageHeader
        eyebrow="Management"
        title="Pool Configuration"
        description="Create and update managed pools, chemistry targets, and dosing rules."
        icon={<SlidersHorizontal className="h-4 w-4" />}
        actions={(
          <Link
            href="/management/pools/new"
            className={buttonClass.primary}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Pool
          </Link>
        )}
      />
      {temporaryLoginBypass && error ? (
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          Login bypass is active, so live Supabase pool data may be hidden until the auth work is finished.
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
              {poolList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8">
                    <EmptyState
                      icon={<Waves className="h-6 w-6" />}
                      title="No pools configured"
                      description="Create a pool to begin assigning tests and tracking chemistry status."
                      action={<Link href="/management/pools/new" className={buttonClass.primary}>Add Pool</Link>}
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
                      <Link href={`/management/pools/${pool.id}/edit`} className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:text-blue-900 transition-colors">
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

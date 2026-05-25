import Link from 'next/link';
import { notFound } from 'next/navigation';
import DevPoolEditForm from '@/components/dev/DevPoolEditForm';
import DevShell from '@/components/dev/DevShell';
import { loadPool, requireDev } from '@/lib/devAdmin';

export const dynamic = 'force-dynamic';

export default async function DevAdminPoolEditPage({ params }: { params: Promise<{ id: string }> }) {
  await requireDev();
  const { id } = await params;
  const pool = await loadPool(id);

  if (!pool) notFound();

  return (
    <DevShell>
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Admin Panel</p>
            <h1 className="text-2xl font-semibold text-slate-950">Edit Pool</h1>
          </div>
          <Link href="/dev-admin/pools" className="text-sm font-semibold text-blue-700 hover:text-blue-900">
            Back to pools
          </Link>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <DevPoolEditForm pool={pool} />
        </div>
      </div>
    </DevShell>
  );
}

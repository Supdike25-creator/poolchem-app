import { Suspense } from 'react';
import ManagementPoolsView from './ManagementPoolsView';

export const dynamic = 'force-dynamic';

export default function ManagementPoolsPage() {
  return (
    <Suspense fallback={<div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">Loading pools...</div>}>
      <ManagementPoolsView />
    </Suspense>
  );
}

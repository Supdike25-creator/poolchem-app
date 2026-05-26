import { Suspense } from 'react';
import LogPageClient from './LogPageClient';

export default function LogPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-sm text-slate-600">Loading log flow...</div>}>
      <LogPageClient />
    </Suspense>
  );
}

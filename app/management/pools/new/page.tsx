import { Suspense } from 'react';
import NewPoolForm from './NewPoolForm';

export default function NewPoolPage() {
  return (
    <Suspense fallback={<div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">Loading...</div>}>
      <NewPoolForm />
    </Suspense>
  );
}

import { Suspense } from 'react';
import AuthShell from '../../components/AuthShell';

export default function GuardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-sm text-slate-600">Loading guard workspace...</div>}>
      <AuthShell role="guard">{children}</AuthShell>
    </Suspense>
  );
}

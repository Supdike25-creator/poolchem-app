import { Suspense } from 'react';
import AuthShell from '../../components/AuthShell';

export default function ManagementLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-sm text-slate-600">Loading management workspace...</div>}>
      <AuthShell role="manager">{children}</AuthShell>
    </Suspense>
  );
}

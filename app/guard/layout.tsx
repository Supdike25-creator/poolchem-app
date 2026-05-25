import { Suspense } from 'react';
import AuthShell from '../../components/AuthShell';
import InstallAppBanner from '../../components/InstallAppBanner';

export default function GuardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-sm text-slate-600">Loading guard workspace...</div>}>
      <AuthShell role="guard">
        <div className="mx-auto w-full max-w-5xl px-4 pt-4 sm:px-6 lg:px-8">
          <InstallAppBanner />
        </div>
        {children}
      </AuthShell>
    </Suspense>
  );
}

'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import BackButton from './BackButton';

export function getWorkspaceHome(role: 'manager' | 'guard', companyId?: string | null) {
  if (role === 'guard') {
    return companyId ? `/worker-view?companyId=${encodeURIComponent(companyId)}` : '/guard';
  }

  return companyId ? `/manager-view?companyId=${encodeURIComponent(companyId)}` : '/management/dashboard';
}

function isWorkspaceHome(pathname: string, role: 'manager' | 'guard') {
  if (role === 'guard') {
    return pathname === '/guard' || pathname === '/worker-view';
  }

  return pathname === '/management/dashboard' || pathname === '/manager-view' || pathname === '/boss-view' || pathname === '/dashboard';
}

function pageHasOwnBack(pathname: string) {
  if (pathname === '/guard/log' || pathname === '/guard/review' || pathname === '/log') {
    return true;
  }

  return /^\/management\/pools(\/|$)/.test(pathname);
}

export default function WorkspaceBackLink({ role }: { role: 'manager' | 'guard' }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const companyId = searchParams.get('companyId');

  if (isWorkspaceHome(pathname, role) || pageHasOwnBack(pathname)) {
    return null;
  }

  const fallbackHref = getWorkspaceHome(role, companyId);
  const label = role === 'manager' ? 'Back to dashboard' : 'Back to workbench';

  return (
    <div className="mb-5">
      <BackButton fallbackHref={fallbackHref} label={label} />
    </div>
  );
}

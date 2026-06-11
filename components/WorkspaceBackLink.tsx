'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import BackButton from './BackButton';

export function getWorkspaceHome(role: 'manager' | 'employee', companyId?: string | null) {
  if (role === 'employee') {
    return companyId ? `/worker-view?companyId=${encodeURIComponent(companyId)}` : '/employee';
  }

  return companyId ? `/manager-view?companyId=${encodeURIComponent(companyId)}` : '/management/dashboard';
}

function isWorkspaceHome(pathname: string, role: 'manager' | 'employee') {
  if (role === 'employee') {
    return pathname === '/employee' || pathname === '/worker-view';
  }

  return pathname === '/management/dashboard' || pathname === '/manager-view' || pathname === '/boss-view' || pathname === '/dashboard';
}

function pageHasOwnBack(pathname: string) {
  if (pathname === '/employee/log' || pathname === '/employee/review' || pathname === '/log') {
    return true;
  }

  return /^\/management\/pools(\/|$)/.test(pathname);
}

export default function WorkspaceBackLink({ role }: { role: 'manager' | 'employee' }) {
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

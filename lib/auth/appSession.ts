import type { NextRequest } from 'next/server';
import { normalizeProfileRole, type AppRole } from '@/lib/auth/accountAccess';

export const appSessionCookie = 'chemdeck_app_session';

export type AppSessionPayload = {
  id?: string;
  name?: string;
  username?: string;
  token?: string;
  role?: string;
  email?: string | null;
  company_id?: string | null;
};

export const readAppSessionValue = (rawSession?: string | null): AppSessionPayload | null => {
  if (!rawSession) return null;

  try {
    const session = JSON.parse(decodeURIComponent(rawSession)) as AppSessionPayload;
    if (!session?.id || !session?.username || !session?.token || !session?.role) {
      return null;
    }

    const role = normalizeProfileRole(session.role);
    if (role === 'dev') return null;

    return { ...session, role };
  } catch {
    return null;
  }
};

export const getAppSessionFromRequest = (request: NextRequest) =>
  readAppSessionValue(request.cookies.get(appSessionCookie)?.value);

export const isAppAccountRequest = (request: NextRequest) => Boolean(getAppSessionFromRequest(request));

export const appSessionRole = (session: AppSessionPayload | null): AppRole | null => {
  if (!session?.role) return null;
  return normalizeProfileRole(session.role);
};

const guardPaths = ['/guard', '/worker-view', '/log'];
const managerPaths = ['/management', '/manager-view', '/boss-view', '/dashboard'];

export const appSessionCanAccessPath = (role: AppRole, pathname: string) => {
  if (pathname.startsWith('/api/')) return true;

  if (role === 'guard') {
    return guardPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  }

  if (role === 'manager') {
    return (
      managerPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))
      || guardPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))
    );
  }

  return false;
};

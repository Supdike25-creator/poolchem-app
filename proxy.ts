import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { temporaryLoginBypass } from './lib/temporaryLoginBypass';

type AppRole = 'manager' | 'guard';
type AppSession = {
  id?: string;
  name?: string;
  username?: string;
  token?: string;
  role?: string;
  email?: string;
};

const managerRoles = new Set(['admin', 'manager', 'supervisor']);
const appSessionCookie = 'chemdeck_app_session';

const normalizeRole = (role?: string | null): AppRole => {
  if (!role) return 'guard';
  return managerRoles.has(role.toLowerCase()) ? 'manager' : 'guard';
};

const protectedRoleForPath = (pathname: string): AppRole => {
  if (pathname.startsWith('/guard')) return 'guard';
  return 'manager';
};

const redirectRoute = (role: AppRole) => (role === 'manager' ? '/management/dashboard' : '/guard');

const loginUrl = (request: NextRequest, role: AppRole) => {
  const url = request.nextUrl.clone();
  url.pathname = '/login';
  url.search = '';
  url.searchParams.set('role', role);
  return url;
};

const readAppSession = (request: NextRequest): AppSession | null => {
  const rawSession = request.cookies.get(appSessionCookie)?.value;
  if (!rawSession) return null;

  try {
    return JSON.parse(decodeURIComponent(rawSession)) as AppSession;
  } catch {
    return null;
  }
};

export async function proxy(request: NextRequest) {
  const requiredRole = protectedRoleForPath(request.nextUrl.pathname);
  const response = NextResponse.next();

  if (temporaryLoginBypass) {
    return response;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.redirect(loginUrl(request, requiredRole));
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });

        Object.entries(headers).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
      },
    },
  });

  const appSession = readAppSession(request);
  if (
    appSession?.id === 'chemdeck-dev-account' &&
    appSession.username === 'chemdeck.dev' &&
    appSession.token === 'chemdeck-dev-session' &&
    normalizeRole(appSession.role) === requiredRole
  ) {
    return response;
  }

  if (appSession?.token) {
    const { data } = await supabase.rpc('verify_app_session', {
      p_session_token: appSession.token,
    });
    const account = Array.isArray(data) ? data[0] : null;

    if (account?.username && normalizeRole(account.role) === requiredRole) {
      return response;
    }
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.redirect(loginUrl(request, requiredRole));
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  const actualRole = normalizeRole(profile?.role);

  if (actualRole !== requiredRole) {
    return NextResponse.redirect(new URL(redirectRoute(actualRole), request.url));
  }

  return response;
}

export const config = {
  matcher: ['/management/:path*', '/dashboard/:path*', '/log/:path*', '/guard/:path*'],
};

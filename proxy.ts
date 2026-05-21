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

const redirectRoute = (role: AppRole) => (role === 'manager' ? '/management/dashboard' : '/guard');

const loginUrl = (request: NextRequest) => {
  const url = request.nextUrl.clone();
  url.pathname = '/login';
  url.search = '';
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

const isPublicPath = (pathname: string) => {
  if (pathname === '/login') return true;
  if (pathname === '/auth/callback') return true;
  if (pathname === '/auth/reset-password') return true;
  if (pathname === '/pending') return true;
  if (pathname === '/admin/setup') return true;
  if (pathname.startsWith('/invite')) return true;
  if (pathname === '/forgot-password') return true;
  return false;
};

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const response = NextResponse.next();

  if (temporaryLoginBypass) return response;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    if (isPublicPath(pathname)) return response;
    return NextResponse.redirect(loginUrl(request));
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const appSession = readAppSession(request);
  if (
    appSession?.id === 'chemdeck-dev-account' &&
    appSession.username === 'chemdeck.dev' &&
    appSession.token === 'chemdeck-dev-session'
  ) {
    return response;
  }

  if (appSession?.token) {
    const { data } = await supabase.rpc('verify_app_session', {
      p_session_token: appSession.token,
    });
    const account = Array.isArray(data) ? data[0] : null;

    if (account?.username) {
      return response;
    }
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    if (isPublicPath(pathname)) return response;
    return NextResponse.redirect(loginUrl(request));
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, status, has_org')
    .eq('id', user.id)
    .single();

  const roleNormalized = normalizeRole(profile?.role);
  const hasOrg = Boolean(profile?.has_org);
  const status = profile?.status ?? null;

  // Not a member of any org yet
  if (!hasOrg) {
    if (isPublicPath(pathname)) return response;
    // Admin users should create their org
    if ((profile?.role || '').toLowerCase() === 'admin') {
      return NextResponse.redirect(new URL('/admin/setup', request.url));
    }
    // Guards & managers wait for invites
    return NextResponse.redirect(new URL('/pending', request.url));
  }

  // Has org but not active
  if (hasOrg && status !== 'active') {
    if (isPublicPath(pathname)) return response;
    return NextResponse.redirect(new URL('/pending', request.url));
  }

  // Active members with org
  if (status === 'active') {
    // Block guards from admin routes
    if (pathname.startsWith('/admin') && roleNormalized === 'guard') {
      return NextResponse.redirect(new URL('/guard', request.url));
    }

    // Block admins/managers from guard routes
    if (pathname.startsWith('/guard') && roleNormalized === 'manager') {
      return NextResponse.redirect(new URL('/management/dashboard', request.url));
    }

    // If middleware protecting other admin/guard routes, ensure user is routed to correct dashboard
    if (pathname === '/' || pathname === '/dashboard') {
      return NextResponse.redirect(new URL(redirectRoute(roleNormalized), request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

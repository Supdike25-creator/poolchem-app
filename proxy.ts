import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeProfileRole, routeForRole, routeForAccess, getAccountAccess } from "@/lib/auth/accountAccess";
import { appSessionCanAccessPath, getAppSessionFromRequest, appSessionRole } from "@/lib/auth/appSession";
import { isDevRequest } from "@/lib/auth/devSession";

const PUBLIC_PATHS = [
  "/",
  "/features",
  "/pricing",
  "/about",
  "/contact",
  "/login",
  "/create-account",
  "/signup",
  "/privacy",
  "/terms",
  "/cookies",
  "/pending",
  "/offline",
  "/manifest.json",
  "/sw.js",
  "/api/contact",
  "/api/create-account",
  "/auth/callback",
  "/api/spotify/callback",
];
const PUBLIC_PREFIXES = ["/invite/", "/api/invites/", "/api/cron/"];
const ROLE_SETUP_PATHS = ["/choose-role", "/api/choose-role"];

const managerDashboardPath = "/management/dashboard";
const employeeDashboardPath = "/employee";
const DEV_ALLOWED_PATHS = [
  "/dev-dashboard",
  "/dev-admin",
  "/worker-view",
  "/manager-view",
  "/boss-view",
  "/employee",
  "/management",
  "/dashboard",
  "/log",
  "/api/dev",
];

const isManagerStoredRole = (role: string) =>
  role === "manager" || role === "admin" || role === "boss" || role === "supervisor";

const isEmployeeStoredRole = (role: string) =>
  role === "employee" || role === "guard" || role === "worker";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/features" || pathname === "/pricing" || pathname === "/about" || pathname === "/contact") {
    return NextResponse.next({ request });
  }

  const hasDevSession = isDevRequest(request);
  const hasJustJoinedCompany = request.cookies.get("chemdeck.justJoinedCompany")?.value === "true";
  const pendingRole = request.cookies.get("chemdeck.pendingRole")?.value;
  const hasPendingRole = pendingRole === "manager" || pendingRole === "employee" || pendingRole === "boss" || pendingRole === "guard";

  if (hasDevSession) {
    if (pathname === "/login" || pathname === "/pending") {
      return NextResponse.redirect(new URL("/dev-dashboard", request.url));
    }

    if (pathname.startsWith("/api/")) {
      return NextResponse.next({ request });
    }

    if (DEV_ALLOWED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
      return NextResponse.next({ request });
    }
  }

  const appSession = getAppSessionFromRequest(request);
  const appRole = appSessionRole(appSession);

  if (appSession && appRole) {
    if (pathname === "/login") {
      return NextResponse.redirect(new URL(routeForRole(appRole), request.url));
    }

    if (appSessionCanAccessPath(appRole, pathname)) {
      return NextResponse.next({ request });
    }

    if (appRole === "employee" && (pathname === "/management" || pathname.startsWith("/management/"))) {
      return NextResponse.redirect(new URL(employeeDashboardPath, request.url));
    }

    if ((appRole === "manager" || appRole === "admin") && pathname.startsWith("/employee/")) {
      return NextResponse.redirect(new URL(managerDashboardPath, request.url));
    }
  }

  if (pathname === "/choose-role" && hasPendingRole) {
    return NextResponse.redirect(new URL("/create-company", request.url));
  }

  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next({ request });
  }

  if (ROLE_SETUP_PATHS.includes(pathname)) {
    return NextResponse.next({ request });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("Supabase environment variables not found");
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl!, supabaseKey!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (!user || error) {
    if (PUBLIC_PATHS.includes(pathname) || PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
      return supabaseResponse;
    }

    return NextResponse.redirect(new URL("/login", request.url));
  }

  const accountDb = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : supabase;
  const { data: userRow } = await accountDb
    .from("users")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const accountRecord = userRow as Record<string, unknown> | null;

  if (!accountRecord) {
    if (pathname.startsWith("/invite/") || pathname === "/api/accept-invite") {
      return supabaseResponse;
    }

    if (hasJustJoinedCompany && pathname === "/") {
      supabaseResponse.cookies.delete("chemdeck.justJoinedCompany");
      return supabaseResponse;
    }

    return NextResponse.redirect(new URL("/create-company", request.url));
  }

  const storedRole = typeof accountRecord.role === "string" ? accountRecord.role.trim().toLowerCase() : "";
  const rawRole = storedRole || (hasPendingRole ? pendingRole : "");
  const role = normalizeProfileRole(rawRole || null);
  const hasCompany = Boolean(accountRecord.company_id || accountRecord.organization_id);
  const rawStatus = typeof accountRecord.status === "string" ? accountRecord.status.toLowerCase().trim() : "";
  const isPendingApproval = rawStatus === "pending" || rawStatus === "unapproved";

  if (isPendingApproval) {
    if (pathname === "/pending") {
      return supabaseResponse;
    }

    return NextResponse.redirect(new URL("/pending", request.url));
  }

  if (rawRole === "dev") {
    if (pathname === "/login" || pathname === "/pending") {
      return NextResponse.redirect(new URL("/dev-dashboard", request.url));
    }

    return supabaseResponse;
  }

  if (!rawRole) {
    return NextResponse.redirect(new URL("/create-company", request.url));
  }

  if (isManagerStoredRole(rawRole) && !hasCompany) {
    if (
      pathname !== "/create-company" &&
      pathname !== "/onboarding/company"
    ) {
      return NextResponse.redirect(new URL("/create-company", request.url));
    }
    return supabaseResponse;
  }

  if (isEmployeeStoredRole(rawRole) && !hasCompany) {
    if (pathname.startsWith("/invite/") || pathname === "/api/accept-invite") {
      return supabaseResponse;
    }

    return NextResponse.redirect(new URL("/choose-role", request.url));
  }

  if (pathname === "/login") {
    return NextResponse.redirect(new URL(routeForRole(role), request.url));
  }

  if (pathname === "/pending") {
    const access = getAccountAccess(accountRecord as Record<string, unknown>);
    return NextResponse.redirect(new URL(routeForAccess(access), request.url));
  }

  if (role === "employee" && pathname.startsWith("/admin/")) {
    return NextResponse.redirect(new URL(employeeDashboardPath, request.url));
  }

  if (
    (role === "manager" || role === "admin") &&
    pathname.startsWith("/employee/")
  ) {
    return NextResponse.redirect(new URL(managerDashboardPath, request.url));
  }

  if (
    role === "employee" &&
    (pathname === "/management" || pathname.startsWith("/management/"))
  ) {
    return NextResponse.redirect(new URL(employeeDashboardPath, request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest\\.json|sw\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp3|wav|ogg|m4a)$).*)",
  ],
};

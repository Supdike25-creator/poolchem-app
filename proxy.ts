import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getAccountAccess, routeForRole } from "@/lib/auth/accountAccess";

const PUBLIC_PATHS = ["/login", "/auth/callback", "/pending", "/onboarding/company"];

const managerDashboardPath = "/management/dashboard";
const guardDashboardPath = "/guard";
const inactiveLoginPath = "/login?error=inactive_account";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
    if (PUBLIC_PATHS.includes(pathname)) {
      return supabaseResponse;
    }

    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    if (pathname === "/login") {
      return supabaseResponse;
    }

    if (pathname !== "/pending") {
      return NextResponse.redirect(new URL(inactiveLoginPath, request.url));
    }
    return supabaseResponse;
  }

  const access = getAccountAccess(profile as Record<string, unknown>);

  if (!access.allowed) {
    if (pathname === "/login") {
      return supabaseResponse;
    }

    if (access.reason === "missing_workspace") {
      if (pathname !== "/onboarding/company") {
        return NextResponse.redirect(new URL("/onboarding/company", request.url));
      }
      return supabaseResponse;
    }

    return NextResponse.redirect(new URL(inactiveLoginPath, request.url));
  }

  const role = access.role;

  if (pathname === "/login" || pathname === "/") {
    return NextResponse.redirect(new URL(routeForRole(role), request.url));
  }

  if (pathname === "/pending") {
    return NextResponse.redirect(new URL(routeForRole(role), request.url));
  }

  if (role === "guard" && pathname.startsWith("/admin/")) {
    return NextResponse.redirect(new URL(guardDashboardPath, request.url));
  }

  if (
    role === "manager" &&
    pathname.startsWith("/guard/")
  ) {
    return NextResponse.redirect(new URL(managerDashboardPath, request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

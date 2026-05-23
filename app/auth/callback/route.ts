import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  getAccountAccess,
  inactiveAccountMessage,
  routeForRole,
} from "@/lib/auth/accountAccess";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!code) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (!supabaseUrl || !supabaseKey) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "auth_not_configured");
    return NextResponse.redirect(loginUrl);
  }

  const response = NextResponse.redirect(new URL("/", request.url));
  const redirectWithCookies = (path: string) => {
    response.headers.set("Location", new URL(path, request.url).toString());
    return response;
  };

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("Supabase OAuth exchange error:", error.message || error);
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", error.message ?? "auth_failed");
    response.headers.set("Location", loginUrl.toString());
    return response;
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("Supabase OAuth user verification error:", userError?.message || "Missing user");
    await supabase.auth.signOut();
    return redirectWithCookies("/login?error=inactive_account");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    console.error("Supabase OAuth profile verification error:", profileError?.message || inactiveAccountMessage);
    await supabase.auth.signOut();
    return redirectWithCookies("/login?error=inactive_account");
  }

  const access = getAccountAccess(profile as Record<string, unknown>);

  if (!access.allowed) {
    if (access.reason === "missing_workspace") {
      return redirectWithCookies("/onboarding/company");
    }

    await supabase.auth.signOut();
    return redirectWithCookies("/login?error=inactive_account");
  }

  return redirectWithCookies(routeForRole(access.role));
}

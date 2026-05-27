import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  normalizeProfileRole,
  routeForRole,
} from "@/lib/auth/accountAccess";

const safeNextPath = (value: string | null) => {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return null;
  }
  return value;
};

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nextPath = safeNextPath(url.searchParams.get("next"));
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

  if (nextPath) {
    return redirectWithCookies(nextPath);
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("Supabase OAuth user verification error:", userError?.message || "Missing user");
    await supabase.auth.signOut();
    return redirectWithCookies("/login");
  }

  const { data: userRow } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const accountRecord = userRow as Record<string, unknown> | null;

  if (!accountRecord) {
    return redirectWithCookies("/choose-role");
  }

  const rawRole = typeof accountRecord.role === "string" ? accountRecord.role.trim().toLowerCase() : "";
  const role = normalizeProfileRole(rawRole || null);

  if (!rawRole) {
    return redirectWithCookies("/choose-role");
  }

  if (rawRole === "boss" && !accountRecord.company_id && !accountRecord.organization_id) {
    return redirectWithCookies("/create-company");
  }

  if (rawRole === "guard" && !accountRecord.company_id && !accountRecord.organization_id) {
    return redirectWithCookies("/choose-role");
  }

  return redirectWithCookies(routeForRole(role));
}

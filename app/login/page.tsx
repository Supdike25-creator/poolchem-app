"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import {
  normalizeProfileRole,
  routeForRole,
} from "@/lib/auth/accountAccess";
import { appSessionCookie, createDevSession, isDevCredentials } from "@/lib/auth/devSession";
import { findAccount, setAppSession } from "@/lib/appAccounts";
import ChemDeckLogo from "@/components/ChemDeckLogo";
import { createClient } from "../../lib/supabase/client";

const authErrorMessages: Record<string, string> = {
  auth_not_configured: "Authentication is not configured for this environment.",
  missing_workspace: "Enter your company code to finish setting up your account.",
};

export default function LoginPage() {
  const router = useRouter();
  const supabase = useMemo(() => {
    try {
      return createClient();
    } catch (clientError) {
      console.error("Supabase login client unavailable:", clientError);
      return null;
    }
  }, []);

  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authError = params.get("error");

    if (!authError) {
      return;
    }

    const timer = window.setTimeout(() => {
      setError(authErrorMessages[authError] ?? authError);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [supabase]);

  const verifyActiveAccount = async () => {
    if (!supabase) {
      return { route: null, message: authErrorMessages.auth_not_configured };
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { route: null, message: userError?.message ?? "Unable to verify this login." };
    }

    const { data: userRow } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    const accountRecord = userRow as Record<string, unknown> | null;

    if (!accountRecord) {
      return { route: "/choose-role", message: "" };
    }

    const rawRole = typeof accountRecord.role === "string" ? accountRecord.role.trim().toLowerCase() : "";
    const role = normalizeProfileRole(rawRole || null);

    if (!rawRole) {
      return { route: "/choose-role", message: "" };
    }

    if (rawRole === "boss" && !accountRecord.company_id && !accountRecord.organization_id) {
      return { route: "/create-company", message: "" };
    }

    if (rawRole === "guard" && !accountRecord.company_id && !accountRecord.organization_id) {
      return { route: "/enter-company-code", message: "" };
    }

    return { route: routeForRole(role), message: "" };
  };

  const handleSignIn = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setNotice("");

    setLoading(true);

    try {
      if (isDevCredentials(loginId, password)) {
        await supabase?.auth.signOut().catch(() => undefined);
        const session = createDevSession();
        window.localStorage.setItem("chemdeck.session", JSON.stringify(session));
        document.cookie = `${appSessionCookie}=${encodeURIComponent(JSON.stringify(session))}; path=/; max-age=2592000; samesite=lax`;
        router.replace("/dev-dashboard");
        router.refresh();
        return;
      }

      const trimmedLogin = loginId.trim();
      const trimmedPassword = password.trim();

      try {
        const account = await findAccount(trimmedLogin, trimmedPassword);
        if (account) {
          await supabase?.auth.signOut().catch(() => undefined);
          setAppSession(account);
          window.location.assign(routeForRole(account.role));
          return;
        }
      } catch (accountError) {
        const message = (accountError as Error).message;
        if (!trimmedLogin.includes("@")) {
          setError(message || "That username and passcode did not match an account.");
          setLoading(false);
          return;
        }
      }

      if (!trimmedLogin.includes("@")) {
        setError("That username and passcode did not match an account.");
        setLoading(false);
        return;
      }

      if (!supabase) {
        setError(authErrorMessages.auth_not_configured);
        setLoading(false);
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: trimmedLogin,
        password: trimmedPassword,
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      const access = await verifyActiveAccount();

      if (!access.route) {
        setError(access.message || "This account cannot access ChemDeck. Please contact your manager or administrator.");
        setLoading(false);
        return;
      }

      router.replace(access.route);
      router.refresh();
    } catch {
      setError("An unexpected error occurred while signing in.");
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setNotice("");

    if (!supabase) {
      setError(authErrorMessages.auth_not_configured);
      return;
    }

    setLoading(true);

    try {
      const { error: signUpError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin + "/auth/callback",
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
      }
    } catch {
      setError("An unexpected error occurred while starting Google sign-in.");
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setError("");
    setNotice("");

    if (!supabase) {
      setError(authErrorMessages.auth_not_configured);
      return;
    }

    setLoading(true);

    try {
      const { error: signUpError } = await supabase.auth.signInWithOAuth({
        provider: "apple",
        options: {
          redirectTo: window.location.origin + "/auth/callback",
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
      }
    } catch {
      setError("An unexpected error occurred while starting Apple sign-in.");
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError("");
    setNotice("");

    if (!supabase) {
      setError(authErrorMessages.auth_not_configured);
      return;
    }

    if (!loginId.trim()) {
      setError("Enter your username or email first, then select Forgot password.");
      return;
    }

    if (!loginId.trim().includes("@")) {
      setError("Password reset requires an email address. Enter the account email or contact your manager.");
      return;
    }

    setLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(loginId.trim(), {
        redirectTo: `${window.location.origin}/login?auth_action=reset_password`,
      });

      if (resetError) {
        setError(resetError.message);
        return;
      }

      setNotice("Password reset link sent. Check your email for the next step.");
    } catch {
      setError("Unable to send password reset email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-white px-6 py-8 text-slate-950 md:bg-slate-50">
      <section className="w-full md:max-w-md md:rounded-2xl md:border md:border-slate-200 md:bg-white md:px-10 md:py-10 md:shadow-[0_2px_16px_rgba(15,23,42,0.06)]">
        <div className="mb-8 text-center">
          <div className="mb-8 flex justify-center">
            <ChemDeckLogo variant="full" scheme="light" className="hidden w-[230px] sm:block" />
            <ChemDeckLogo variant="mark" scheme="light" className="h-12 w-12 sm:hidden" />
          </div>
        </div>

        {(!supabase || error) && (
          <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm leading-6 text-red-700">
              {error || authErrorMessages.auth_not_configured}
            </p>
          </div>
        )}
        {notice && (
          <div className="mb-5 rounded-md border border-blue-200 bg-blue-50 px-4 py-3">
            <p className="text-sm leading-6 text-blue-900">{notice}</p>
          </div>
        )}

        <form onSubmit={handleSignIn} className="space-y-5">
          <div>
            <label htmlFor="login-id" className="mb-2 block text-sm font-medium text-slate-700">
              Username or email
            </label>
            <input
              id="login-id"
              type="text"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              placeholder="username or you@example.com"
              className="h-12 w-full rounded-md border border-slate-200 bg-slate-50 px-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              disabled={loading}
              autoComplete="username"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-700">
              Password / passcode
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your passcode or password"
                className="h-12 w-full rounded-md border border-slate-200 bg-slate-50 px-4 pr-12 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                disabled={loading}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                disabled={loading}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-slate-400 transition hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="mt-3 flex items-center justify-between gap-4">
              <label
                htmlFor="remember-me"
                className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-600 transition hover:text-slate-950"
              >
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                  disabled={loading}
                  className="h-3.5 w-3.5 rounded border-slate-300 bg-white text-blue-600 accent-blue-600"
                />
                <span>Remember me</span>
              </label>
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={loading || !supabase}
                className="text-xs font-semibold text-slate-600 transition hover:text-slate-950 disabled:cursor-not-allowed disabled:text-slate-400"
              >
                Forgot password?
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex h-12 w-full items-center justify-center rounded-md bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
          <Link
            href="/create-account"
            className="flex h-12 w-full items-center justify-center rounded-md border border-[#3EC6FF] bg-[rgba(62,198,255,0.15)] px-4 text-sm font-semibold text-[#3EC6FF] transition hover:bg-[rgba(62,198,255,0.25)]"
          >
            Create Account
          </Link>
        </form>

        <div className="my-7 flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
            OR CONTINUE WITH
          </span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading || !supabase}
            className="flex h-12 w-full items-center justify-center gap-3 rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:border-blue-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Sign in with Google
          </button>

          <button
            type="button"
            onClick={handleAppleSignIn}
            disabled={loading || !supabase}
            className="flex h-12 w-full items-center justify-center gap-3 rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:border-blue-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg className="h-5 w-5 text-slate-950" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M16.37 1.43c0 1.02-.42 1.97-1.12 2.7-.75.78-1.94 1.38-2.9 1.3-.13-.98.35-2.02 1.04-2.76.75-.8 2.07-1.4 2.98-1.24ZM20.34 17.06c-.42.97-.62 1.4-1.16 2.25-.75 1.15-1.8 2.58-3.1 2.59-1.15.01-1.45-.75-3.02-.74-1.57.01-1.9.75-3.05.74-1.3-.01-2.3-1.3-3.05-2.45-2.08-3.2-2.3-6.96-1.02-8.95.92-1.42 2.36-2.25 3.72-2.25 1.38 0 2.25.76 3.4.76 1.1 0 1.78-.77 3.38-.77 1.2 0 2.48.66 3.39 1.79-2.98 1.64-2.5 5.9.51 7.03Z" />
            </svg>
            Sign in with Apple
          </button>
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/"
            className="text-sm font-medium text-slate-500 transition hover:text-blue-600"
          >
            Back to homepage
          </Link>
        </div>
      </section>
    </main>
  );
}

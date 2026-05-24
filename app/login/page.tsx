"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getAccountAccess,
  inactiveAccountMessage,
  routeForRole,
} from "@/lib/auth/accountAccess";
import { appSessionCookie, createDevSession, isDevCredentials } from "@/lib/auth/devSession";
import ChemDeckLogo from "@/components/ChemDeckLogo";
import { createClient } from "../../lib/supabase/client";

const authErrorMessages: Record<string, string> = {
  auth_not_configured: "Authentication is not configured for this environment.",
  inactive_account: inactiveAccountMessage,
  missing_workspace: "Your workspace is not ready yet. Please contact your manager or administrator.",
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

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authError = params.get("error");

    if (!authError) {
      return;
    }

    const timer = window.setTimeout(() => {
      setError(authErrorMessages[authError] ?? authError);
    }, 0);

    if (authError === "inactive_account" || authError === "missing_workspace") {
      supabase?.auth.signOut().catch((signOutError) => {
        console.error("Unable to clear inactive session:", signOutError);
      });
    }

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

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      await supabase.auth.signOut();
      return { route: null, message: inactiveAccountMessage };
    }

    const access = getAccountAccess(profile as Record<string, unknown>);

    if (!access.allowed) {
      if (access.reason === "missing_workspace") {
        return { route: "/onboarding/company", message: "" };
      }

      await supabase.auth.signOut();
      return { route: null, message: inactiveAccountMessage };
    }

    return { route: routeForRole(access.role), message: "" };
  };

  const handleEmailSignIn = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setNotice("");

    setLoading(true);

    try {
      if (isDevCredentials(email, password)) {
        await supabase?.auth.signOut().catch(() => undefined);
        const session = createDevSession();
        window.localStorage.setItem("chemdeck.session", JSON.stringify(session));
        document.cookie = `${appSessionCookie}=${encodeURIComponent(JSON.stringify(session))}; path=/; max-age=2592000; samesite=lax`;
        router.replace("/dev-dashboard");
        router.refresh();
        return;
      }

      if (!supabase) {
        setError(authErrorMessages.auth_not_configured);
        setLoading(false);
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      const access = await verifyActiveAccount();

      if (!access.route) {
        setError(access.message || inactiveAccountMessage);
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

    if (!email.trim()) {
      setError("Enter your email first, then select Forgot password.");
      return;
    }

    setLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
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
    <main className="flex min-h-screen w-full items-center justify-center bg-[#0A1A2F] px-5 py-8 text-[#D9E1E8] sm:px-6">
      <section className="w-full max-w-[420px]">
        <div className="mb-10 text-center">
          <div className="mb-8 flex justify-center">
            <ChemDeckLogo variant="full" scheme="dark" className="hidden w-[230px] sm:block" />
            <ChemDeckLogo variant="mark" scheme="dark" className="h-12 w-12 sm:hidden" />
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-white">Sign in</h1>
          <p className="mt-3 text-sm leading-6 text-[#D9E1E8]/80">Access your pool chemistry workspace.</p>
        </div>

        {(!supabase || error) && (
          <div className="mb-5 rounded-md border border-red-300/30 bg-red-500/10 px-4 py-3">
            <p className="text-sm leading-6 text-red-100">
              {error || authErrorMessages.auth_not_configured}
            </p>
          </div>
        )}
        {notice && (
          <div className="mb-5 rounded-md border border-[#3EC6FF]/30 bg-[#3EC6FF]/10 px-4 py-3">
            <p className="text-sm leading-6 text-[#D9E1E8]">{notice}</p>
          </div>
        )}

        <form onSubmit={handleEmailSignIn} className="space-y-5">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium text-[#D9E1E8]">
              Email
            </label>
            <input
              id="email"
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="h-12 w-full rounded-md border border-white/10 bg-white/[0.08] px-4 text-sm text-white outline-none transition placeholder:text-[#D9E1E8]/45 focus:border-[#3EC6FF]/70 focus:ring-2 focus:ring-[#3EC6FF]/20"
              disabled={loading}
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium text-[#D9E1E8]">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="h-12 w-full rounded-md border border-white/10 bg-white/[0.08] px-4 text-sm text-white outline-none transition placeholder:text-[#D9E1E8]/45 focus:border-[#3EC6FF]/70 focus:ring-2 focus:ring-[#3EC6FF]/20"
              disabled={loading}
              autoComplete="current-password"
              required
            />
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={loading || !supabase}
                className="text-sm font-medium text-[#3EC6FF] transition hover:text-[#8DE0FF] disabled:cursor-not-allowed disabled:text-[#D9E1E8]/35"
              >
                Forgot password?
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex h-12 w-full items-center justify-center rounded-md bg-[#3EC6FF] px-4 text-sm font-semibold text-[#0A1A2F] transition hover:bg-[#78D8FF] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-[#D9E1E8]/40"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="my-7 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/15" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#D9E1E8]/55">
            OR CONTINUE WITH
          </span>
          <div className="h-px flex-1 bg-white/15" />
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading || !supabase}
            className="flex h-12 w-full items-center justify-center gap-3 rounded-md border border-white/20 bg-transparent px-4 text-sm font-medium text-[#D9E1E8] transition hover:border-[#3EC6FF]/60 hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-50"
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
            className="flex h-12 w-full items-center justify-center gap-3 rounded-md border border-white/20 bg-transparent px-4 text-sm font-medium text-[#D9E1E8] transition hover:border-[#3EC6FF]/60 hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M16.37 1.43c0 1.02-.42 1.97-1.12 2.7-.75.78-1.94 1.38-2.9 1.3-.13-.98.35-2.02 1.04-2.76.75-.8 2.07-1.4 2.98-1.24ZM20.34 17.06c-.42.97-.62 1.4-1.16 2.25-.75 1.15-1.8 2.58-3.1 2.59-1.15.01-1.45-.75-3.02-.74-1.57.01-1.9.75-3.05.74-1.3-.01-2.3-1.3-3.05-2.45-2.08-3.2-2.3-6.96-1.02-8.95.92-1.42 2.36-2.25 3.72-2.25 1.38 0 2.25.76 3.4.76 1.1 0 1.78-.77 3.38-.77 1.2 0 2.48.66 3.39 1.79-2.98 1.64-2.5 5.9.51 7.03Z" />
            </svg>
            Sign in with Apple
          </button>
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/"
            className="text-sm font-medium text-[#D9E1E8]/70 transition hover:text-[#3EC6FF]"
          >
            Back to homepage
          </Link>
        </div>
      </section>
    </main>
  );
}

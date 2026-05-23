"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";

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
    if (authError) {
      setError(authError === "auth_not_configured" ? "Authentication is not configured for this environment." : authError);
    }
  }, []);

  const handleEmailSignIn = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setNotice("");

    if (!supabase) {
      setError("Authentication is not configured for this environment.");
      return;
    }

    setLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      // On successful email login, call router.refresh()
      // middleware handles the redirect
      router.refresh();
    } catch (err) {
      setError("An unexpected error occurred");
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setNotice("");

    if (!supabase) {
      setError("Authentication is not configured for this environment.");
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
    } catch (err) {
      setError("An unexpected error occurred");
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setError("");
    setNotice("");

    if (!supabase) {
      setError("Authentication is not configured for this environment.");
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
    } catch (err) {
      setError("An unexpected error occurred");
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError("");
    setNotice("");

    if (!supabase) {
      setError("Authentication is not configured for this environment.");
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="w-full max-w-md px-6 py-8 bg-white rounded-lg shadow-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900">ChemDeck</h1>
          <p className="text-slate-600 mt-1">Pool Chemistry Management</p>
        </div>

        {/* Error Message */}
        {(!supabase || error) && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700 text-sm">{error || "Authentication is not configured for this environment."}</p>
          </div>
        )}
        {notice && (
          <div className="mb-6 rounded-md border border-green-200 bg-green-50 p-4">
            <p className="text-sm text-green-700">{notice}</p>
          </div>
        )}

        {/* Email/Password Form */}
        <form onSubmit={handleEmailSignIn} className="space-y-4 mb-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading || !supabase}
              required
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between gap-3">
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                Password
              </label>
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={loading || !supabase}
                className="text-sm font-semibold text-blue-700 transition hover:text-blue-800 disabled:cursor-not-allowed disabled:text-slate-400"
              >
                Forgot password?
              </button>
            </div>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading || !supabase}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || !supabase}
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {/* Divider */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-slate-500">Or continue with</span>
          </div>
        </div>

        {/* OAuth Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleGoogleSignIn}
            disabled={loading || !supabase}
            className="w-full py-2 px-4 border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Sign in with Google
          </button>

          <button
            onClick={handleAppleSignIn}
            disabled={loading || !supabase}
            className="w-full py-2 px-4 border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <svg className="h-5 w-5 text-slate-950" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M16.37 1.43c0 1.02-.42 1.97-1.12 2.7-.75.78-1.94 1.38-2.9 1.3-.13-.98.35-2.02 1.04-2.76.75-.8 2.07-1.4 2.98-1.24ZM20.34 17.06c-.42.97-.62 1.4-1.16 2.25-.75 1.15-1.8 2.58-3.1 2.59-1.15.01-1.45-.75-3.02-.74-1.57.01-1.9.75-3.05.74-1.3-.01-2.3-1.3-3.05-2.45-2.08-3.2-2.3-6.96-1.02-8.95.92-1.42 2.36-2.25 3.72-2.25 1.38 0 2.25.76 3.4.76 1.1 0 1.78-.77 3.38-.77 1.2 0 2.48.66 3.39 1.79-2.98 1.64-2.5 5.9.51 7.03Z" />
            </svg>
            Sign in with Apple
          </button>
        </div>
      </div>
    </div>
  );
}

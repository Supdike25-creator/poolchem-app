"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import ChemDeckLogo from "@/components/ChemDeckLogo";
import { createClient } from "@/lib/supabase/client";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function CreateAccountForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");

    const normalizedEmail = email.trim().toLowerCase();

    if (!emailPattern.test(normalizedEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/create-account", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email: normalizedEmail,
          password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result?.message || "Unable to create account.");
        return;
      }

      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      setNotice("Account created. Redirecting...");
      window.setTimeout(() => {
        router.replace("/choose-role");
      }, 700);
    } catch {
      setError("Unable to create account. Please try again.");
    } finally {
      setSubmitting(false);
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
          <h1 className="text-4xl font-semibold tracking-tight text-white">Create account</h1>
          <p className="mt-3 text-sm leading-6 text-[#D9E1E8]/80">
            Create your ChemDeck account. Lifeguards should use the invite link from their supervisor instead.
          </p>
        </div>

        {error ? (
          <div className="mb-5 rounded-md border border-red-300/30 bg-red-500/10 px-4 py-3">
            <p className="text-sm leading-6 text-red-100">{error}</p>
          </div>
        ) : null}
        {notice ? (
          <div className="mb-5 rounded-md border border-[#3EC6FF]/30 bg-[#3EC6FF]/10 px-4 py-3">
            <p className="text-sm leading-6 text-[#D9E1E8]">{notice}</p>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-5">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[#D9E1E8]">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="h-12 w-full rounded-md border border-white/10 bg-white/[0.08] px-4 text-sm text-white outline-none transition placeholder:text-[#D9E1E8]/45 focus:border-[#3EC6FF]/70 focus:ring-2 focus:ring-[#3EC6FF]/20"
              disabled={submitting}
              autoComplete="email"
              required
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[#D9E1E8]">Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Create a password"
              className="h-12 w-full rounded-md border border-white/10 bg-white/[0.08] px-4 text-sm text-white outline-none transition placeholder:text-[#D9E1E8]/45 focus:border-[#3EC6FF]/70 focus:ring-2 focus:ring-[#3EC6FF]/20"
              disabled={submitting}
              autoComplete="new-password"
              required
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[#D9E1E8]">Confirm Password</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Confirm your password"
              className="h-12 w-full rounded-md border border-white/10 bg-white/[0.08] px-4 text-sm text-white outline-none transition placeholder:text-[#D9E1E8]/45 focus:border-[#3EC6FF]/70 focus:ring-2 focus:ring-[#3EC6FF]/20"
              disabled={submitting}
              autoComplete="new-password"
              required
            />
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="flex h-12 w-full items-center justify-center rounded-md border border-[#3EC6FF] bg-[rgba(62,198,255,0.15)] px-4 text-sm font-semibold text-[#3EC6FF] transition hover:bg-[rgba(62,198,255,0.25)] disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/10 disabled:text-[#D9E1E8]/40"
          >
            {submitting ? "Creating..." : "Create Account"}
          </button>
        </form>

        <div className="mt-8 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#D9E1E8]/70 transition hover:text-[#3EC6FF]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>
        </div>
      </section>
    </main>
  );
}

export default function CreateAccountPage() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-[#0A1A2F] text-sm text-[#D9E1E8]/80">Loading...</main>}>
      <CreateAccountForm />
    </Suspense>
  );
}

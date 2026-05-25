"use client";

import { FormEvent, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, ChevronLeft, KeyRound } from "lucide-react";
import ChemDeckLogo from "@/components/ChemDeckLogo";
import { normalizeProfileRole, routeForRole } from "@/lib/auth/accountAccess";
import { createClient } from "@/lib/supabase/client";

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

function EnterCompanyCodeForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  const [companyCode, setCompanyCode] = useState(() => searchParams.get("code")?.trim().toUpperCase() || "");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [checking, setChecking] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const readCompanyId = useCallback(async (userId: string) => {
    const [{ data: profile }, { data: userRow }] = await Promise.all([
      supabase
        .from("profiles")
        .select("company_id")
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("users")
        .select("company_id")
        .eq("id", userId)
        .maybeSingle(),
    ]);

    return profile?.company_id || userRow?.company_id || null;
  }, [supabase]);

  const readUserRoute = useCallback(async (userId: string) => {
    const { data: userRow } = await supabase
      .from("users")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    return routeForRole(normalizeProfileRole(userRow?.role));
  }, [supabase]);

  const refreshAndConfirmCompany = async (expectedCompanyId?: string | null) => {
    const { data: refreshed } = await supabase.auth.refreshSession();
    const { data: currentUserResult } = await supabase.auth.getUser();
    const refreshedUser = currentUserResult.user || refreshed.user;

    const metadataCompanyId =
      refreshedUser?.app_metadata?.company_id ||
      refreshedUser?.user_metadata?.company_id ||
      null;

    if (metadataCompanyId && (!expectedCompanyId || metadataCompanyId === expectedCompanyId)) {
      return metadataCompanyId as string;
    }

    if (!refreshedUser?.id) {
      return null;
    }

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const companyId = await readCompanyId(refreshedUser.id);
      if (companyId && (!expectedCompanyId || companyId === expectedCompanyId)) {
        return companyId;
      }
      await sleep(250);
    }

    return null;
  };

  useEffect(() => {
    let mounted = true;

    const checkCompanyStatus = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.replace("/login");
        return;
      }

      const companyId = await readCompanyId(session.user.id);
      const justJoinedCompany = window.localStorage.getItem("chemdeck.justJoinedCompany") === "true";

      if (companyId || justJoinedCompany) {
        const route = await readUserRoute(session.user.id);
        window.localStorage.removeItem("chemdeck.justJoinedCompany");
        router.replace(route);
        return;
      }

      if (mounted) {
        setChecking(false);
      }
    };

    checkCompanyStatus();

    return () => {
      mounted = false;
    };
  }, [readCompanyId, readUserRoute, router, supabase]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");

    const normalizedCode = companyCode.trim().toUpperCase();

    if (!normalizedCode) {
      setError("Enter a company code.");
      return;
    }

    setSubmitting(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.replace("/login");
        return;
      }

      const response = await fetch("/api/join-company", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          company_code: normalizedCode,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result?.message || "Invalid or expired company code.");
        return;
      }

      setNotice("Company joined. Refreshing session...");
      const confirmedCompanyId = await refreshAndConfirmCompany(result?.company_id || result?.company?.id || null);

      if (!confirmedCompanyId) {
        setError("Company joined, but ChemDeck is still refreshing your account. Try again in a moment.");
        return;
      }

      window.localStorage.setItem("chemdeck.justJoinedCompany", "true");
      document.cookie = "chemdeck.justJoinedCompany=true; path=/; max-age=60; samesite=lax";
      setNotice("Company joined. Redirecting...");
      router.replace(result?.redirectTo || await readUserRoute(session.user.id));
      router.refresh();
    } catch {
      setError("Unable to join company. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-[#0A1A2F] px-5 py-8 text-[#D9E1E8] sm:px-6">
      <Link
        href="/"
        aria-label="Back to homepage"
        className="absolute left-6 top-6 inline-flex h-10 w-10 items-center justify-center rounded-md border border-white/10 bg-white/[0.06] text-[#D9E1E8]/80 transition hover:border-[#3EC6FF]/50 hover:bg-[rgba(62,198,255,0.12)] hover:text-[#3EC6FF]"
      >
        <ChevronLeft className="h-5 w-5" />
      </Link>
      <section className="w-full max-w-[420px]">
        <div className="mb-10 text-center">
          <div className="mb-8 flex justify-center">
            <ChemDeckLogo variant="full" scheme="dark" className="hidden w-[230px] sm:block" />
            <ChemDeckLogo variant="mark" scheme="dark" className="h-12 w-12 sm:hidden" />
          </div>
          <div className="mb-5 flex justify-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-md border border-[#3EC6FF]/40 bg-[rgba(62,198,255,0.12)] text-[#3EC6FF]">
              <Building2 className="h-5 w-5" />
            </span>
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-white">Join company</h1>
          <p className="mt-3 text-sm leading-6 text-[#D9E1E8]/80">
            Enter the company code from your ChemDeck manager.
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

        {checking ? (
          <div className="rounded-md border border-[#3EC6FF]/30 bg-[#3EC6FF]/10 px-4 py-3">
            <p className="text-sm leading-6 text-[#D9E1E8]">Checking company status...</p>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[#D9E1E8]">Company Code</span>
            <input
              type="text"
              value={companyCode}
              onChange={(event) => setCompanyCode(event.target.value.toUpperCase())}
              placeholder="CHEM1234"
              className="h-12 w-full rounded-md border border-white/10 bg-white/[0.08] px-4 text-sm font-semibold uppercase tracking-[0.16em] text-white outline-none transition placeholder:text-[#D9E1E8]/45 focus:border-[#3EC6FF]/70 focus:ring-2 focus:ring-[#3EC6FF]/20"
              disabled={submitting}
              autoComplete="off"
              required
            />
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="flex h-12 w-full items-center justify-center rounded-md border border-[#3EC6FF] bg-[rgba(62,198,255,0.15)] px-4 text-sm font-semibold text-[#3EC6FF] transition hover:bg-[rgba(62,198,255,0.25)] disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/10 disabled:text-[#D9E1E8]/40"
          >
            <KeyRound className="mr-2 h-4 w-4" />
            {submitting ? "Joining..." : "Join Company"}
          </button>
        </form>
        )}
      </section>
    </main>
  );
}

export default function EnterCompanyCodePage() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-[#0A1A2F] text-sm text-[#D9E1E8]/80">Loading...</main>}>
      <EnterCompanyCodeForm />
    </Suspense>
  );
}

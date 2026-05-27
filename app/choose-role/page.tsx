"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, Mail } from "lucide-react";
import ChemDeckLogo from "@/components/ChemDeckLogo";
import { createClient } from "@/lib/supabase/client";

export default function ChooseRolePage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [checking, setChecking] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.replace("/login");
        return;
      }

      const { data: userRow } = await supabase
        .from("users")
        .select("role, company_id")
        .eq("id", session.user.id)
        .maybeSingle();

      const role = userRow?.role?.trim().toLowerCase();
      if (role === "boss" && userRow?.company_id) {
        router.replace("/management/dashboard");
        return;
      }

      if (role === "boss" && !userRow?.company_id) {
        router.replace("/create-company");
        return;
      }

      if (userRow?.company_id) {
        router.replace(role === "boss" || role === "manager" || role === "supervisor" ? "/management/dashboard" : "/guard");
        return;
      }

      setChecking(false);
    };

    void checkSession();
  }, [router, supabase]);

  const createManagerWorkspace = async () => {
    setError("");
    setNotice("");
    setSubmitting(true);

    try {
      const response = await fetch("/api/choose-role", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role: "boss" }),
      });
      const result = await response.json();

      if (!response.ok) {
        setError(result?.message || "Unable to save role.");
        return;
      }

      window.location.href = result?.redirectTo || "/create-company";
    } catch {
      setError("Unable to save role. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-[#0A1A2F] px-5 py-8 text-[#D9E1E8] sm:px-6">
      <section className="w-full max-w-[520px]">
        <div className="mb-10 text-center">
          <div className="mb-8 flex justify-center">
            <ChemDeckLogo variant="full" scheme="dark" className="hidden w-[230px] sm:block" />
            <ChemDeckLogo variant="mark" scheme="dark" className="h-12 w-12 sm:hidden" />
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-white">Get started</h1>
          <p className="mt-3 text-sm leading-6 text-[#D9E1E8]/80">
            Managers create a company workspace. Lifeguards join through an email invite from their supervisor.
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
            <p className="text-sm leading-6 text-[#D9E1E8]">Checking account...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => void createManagerWorkspace()}
              disabled={submitting}
              className="w-full rounded-md border border-[#3EC6FF]/50 bg-[rgba(62,198,255,0.12)] p-5 text-left transition hover:bg-[rgba(62,198,255,0.2)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-md border border-[#3EC6FF]/40 bg-[#3EC6FF]/10 text-[#3EC6FF]">
                <Building2 className="h-5 w-5" />
              </span>
              <span className="block text-lg font-semibold text-white">
                {submitting ? "Setting up..." : "I'm a manager / supervisor"}
              </span>
              <span className="mt-2 block text-sm leading-6 text-[#D9E1E8]/75">
                Create your company workspace and invite your team by email.
              </span>
            </button>

            <div className="rounded-md border border-white/10 bg-white/[0.04] p-5">
              <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-md border border-white/10 bg-white/5 text-[#D9E1E8]">
                <Mail className="h-5 w-5" />
              </span>
              <span className="block text-lg font-semibold text-white">I'm a lifeguard</span>
              <span className="mt-2 block text-sm leading-6 text-[#D9E1E8]/75">
                Ask your supervisor to send you a ChemDeck invite email. Open that link to create your account and join their company automatically.
              </span>
              <Link
                href="/login"
                className="mt-4 inline-flex text-sm font-semibold text-[#3EC6FF] hover:underline"
              >
                Already have an invite? Sign in
              </Link>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

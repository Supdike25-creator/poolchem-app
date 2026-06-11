"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail } from "lucide-react";
import ChemDeckLogo from "@/components/ChemDeckLogo";
import { createClient } from "@/lib/supabase/client";

export default function ChooseRolePage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const resolveAccount = async () => {
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

      const role = userRow?.role?.trim().toLowerCase() || "";

      if (userRow?.company_id) {
        router.replace(
          role === "manager" || role === "manager" || role === "manager"
            ? "/management/dashboard"
            : "/employee",
        );
        return;
      }

      if (role === "manager" || !userRow) {
        if (!userRow || role !== "manager") {
          await fetch("/api/choose-role", {
            method: "POST",
            credentials: "same-origin",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ role: "manager" }),
          });
        }
        router.replace("/create-company");
        return;
      }

      setChecking(false);
    };

    void resolveAccount();
  }, [router, supabase]);

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-[#0A1A2F] px-5 py-8 text-[#D9E1E8] sm:px-6">
      <section className="w-full max-w-[520px]">
        <div className="mb-10 text-center">
          <div className="mb-8 flex justify-center">
            <ChemDeckLogo variant="full" scheme="dark" className="hidden w-[230px] sm:block" />
            <ChemDeckLogo variant="mark" scheme="dark" className="h-12 w-12 sm:hidden" />
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-white">
            {checking ? "Checking account..." : "Invite required"}
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#D9E1E8]/80">
            {checking
              ? "One moment while we route you to the right place."
              : "Employee accounts are created through an email invite from a supervisor."}
          </p>
        </div>

        {!checking ? (
          <div className="rounded-md border border-white/10 bg-white/[0.04] p-5">
            <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-md border border-white/10 bg-white/5 text-[#D9E1E8]">
              <Mail className="h-5 w-5" />
            </span>
            <span className="block text-lg font-semibold text-white">Need an invite</span>
            <span className="mt-2 block text-sm leading-6 text-[#D9E1E8]/75">
              Ask your supervisor to send you a ChemDeck invite email. Open that link to create your account and join their company automatically.
            </span>
            <Link
              href="/login"
              className="mt-4 inline-flex text-sm font-semibold text-[#3EC6FF] hover:underline"
            >
              Back to sign in
            </Link>
          </div>
        ) : null}
      </section>
    </main>
  );
}

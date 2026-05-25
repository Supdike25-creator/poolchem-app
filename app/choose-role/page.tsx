"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, ShieldCheck } from "lucide-react";
import ChemDeckLogo from "@/components/ChemDeckLogo";
import { createClient } from "@/lib/supabase/client";

type RoleChoice = "boss" | "guard";

const roleOptions: Array<{
  role: RoleChoice;
  title: string;
  description: string;
  icon: typeof Building2;
}> = [
  {
    role: "boss",
    title: "Manager",
    description: "Create and manage a company workspace.",
    icon: Building2,
  },
  {
    role: "guard",
    title: "Lifeguard",
    description: "Join a company using a company code.",
    icon: ShieldCheck,
  },
];

export default function ChooseRolePage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [checking, setChecking] = useState(true);
  const [submittingRole, setSubmittingRole] = useState<RoleChoice | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      const hasPendingRole =
        document.cookie.includes("chemdeck.pendingRole=boss") ||
        document.cookie.includes("chemdeck.pendingRole=guard");

      if (hasPendingRole) {
        router.replace("/enter-company-code");
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.replace("/login");
        return;
      }

      const { data: userRow } = await supabase
        .from("users")
        .select("role")
        .eq("id", session.user.id)
        .maybeSingle();

      const role = userRow?.role?.trim().toLowerCase();
      if (role === "boss" || role === "guard") {
        router.replace("/enter-company-code");
        return;
      }

      setChecking(false);
    };

    checkSession();
  }, [router, supabase]);

  const chooseRole = async (role: RoleChoice) => {
    setError("");
    setNotice("");
    setSubmittingRole(role);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch("/api/choose-role", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ role }),
        signal: controller.signal,
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result?.message || "Unable to save role.");
        return;
      }

      setNotice("Role saved. Redirecting to company code...");
      window.setTimeout(() => {
        window.location.href = result?.redirectTo || "/enter-company-code";
      }, 50);
    } catch (requestError) {
      setError(
        requestError instanceof DOMException && requestError.name === "AbortError"
          ? "Saving role took too long. Please try again."
          : "Unable to save role. Please try again.",
      );
    } finally {
      window.clearTimeout(timeout);
      setSubmittingRole(null);
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
          <h1 className="text-4xl font-semibold tracking-tight text-white">Choose role</h1>
          <p className="mt-3 text-sm leading-6 text-[#D9E1E8]/80">
            Pick how this ChemDeck account will be used.
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
        <div className="grid gap-4 sm:grid-cols-2">
          {roleOptions.map(({ role, title, description, icon: Icon }) => (
            <button
              key={role}
              type="button"
              onClick={() => chooseRole(role)}
              disabled={Boolean(submittingRole)}
              className="rounded-md border border-[#3EC6FF]/50 bg-[rgba(62,198,255,0.12)] p-5 text-left transition hover:bg-[rgba(62,198,255,0.2)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-md border border-[#3EC6FF]/40 bg-[#3EC6FF]/10 text-[#3EC6FF]">
                <Icon className="h-5 w-5" />
              </span>
              <span className="block text-lg font-semibold text-white">
                {submittingRole === role ? "Saving..." : title}
              </span>
              <span className="mt-2 block text-sm leading-6 text-[#D9E1E8]/75">{description}</span>
            </button>
          ))}
        </div>
        )}
      </section>
    </main>
  );
}

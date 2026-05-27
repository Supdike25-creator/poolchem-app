"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, KeyRound } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { normalizeProfileRole, routeForRole } from "@/lib/auth/accountAccess";

type Profile = {
  id: string;
  role?: string | null;
  company_id?: string | null;
};

const bossRoles = new Set(["boss", "manager", "admin", "supervisor", "owner"]);

export default function CompanyOnboardingPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [companyCode, setCompanyCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const rawRole = profile?.role?.toLowerCase().trim() || "guard";
  const isBoss = bossRoles.has(rawRole);
  const route = routeForRole(normalizeProfileRole(profile?.role));

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.replace("/login");
        return;
      }

      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("id,role,company_id")
        .eq("id", session.user.id)
        .single();

      if (!mounted) return;

      if (profileError || !data) {
        setError(profileError?.message || "Unable to load your account profile.");
        setLoading(false);
        return;
      }

      if (data.company_id) {
        router.replace(routeForRole(normalizeProfileRole(data.role)));
        return;
      }

      setProfile(data);
      setLoading(false);
    };

    loadProfile();

    return () => {
      mounted = false;
    };
  }, [router, supabase]);

  const handleCreateCompany = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!profile?.id || !companyName.trim()) {
      setError("Enter a company name.");
      return;
    }

    setSubmitting(true);
    const { data, error: rpcError } = await supabase.rpc("create_company_for_boss", {
      p_boss_user_id: profile.id,
      p_company_name: companyName.trim(),
    });
    setSubmitting(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    const createdCompany = Array.isArray(data) ? data[0] : data;
    setMessage(`Company created. Invite your team from the Team page.`);
    router.replace(route);
    router.refresh();
  };

  const handleJoinCompany = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!profile?.id || !companyCode.trim()) {
      setError("Enter a company code.");
      return;
    }

    setSubmitting(true);
    const { error: rpcError } = await supabase.rpc("join_company_by_code", {
      p_user_id: profile.id,
      p_company_code: companyCode.trim(),
    });
    setSubmitting(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    setMessage("Company joined.");
    router.replace(route);
    router.refresh();
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-8 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
          Workspace setup
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
          {isBoss ? "Create your company" : "Join your company"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {isBoss
            ? "Manager accounts create the ChemDeck company workspace, then invite staff by email."
            : "Lifeguard accounts join through an email invite from a supervisor."}
        </p>

        {loading ? (
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            Loading your account...
          </div>
        ) : isBoss ? (
          <form onSubmit={handleCreateCompany} className="mt-6 space-y-4">
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Company name</span>
              <input
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
                className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="Example: Northside Aquatics"
                required
              />
            </label>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              <Building2 className="mr-2 h-4 w-4" />
              {submitting ? "Creating..." : "Create company"}
            </button>
          </form>
        ) : (
          <div className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-700">
            <p>Open the invite email from your supervisor and follow the link to create your account.</p>
            <p>ChemDeck will add you to their company automatically — no codes needed.</p>
            <Link
              href="/choose-role"
              className="inline-flex h-10 items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
            >
              Back to get started
            </Link>
          </div>
        )}

        {error ? (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>
        ) : null}
        {message ? (
          <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">{message}</div>
        ) : null}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/pending"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            View account status
          </Link>
          <Link
            href="/login"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Back to login
          </Link>
        </div>
      </section>
    </main>
  );
}

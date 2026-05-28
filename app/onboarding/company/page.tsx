'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building2, CheckCircle2, Mail, Plus, Waves } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { normalizeProfileRole, routeForRole } from '@/lib/auth/accountAccess';

type AccountRow = {
  id: string;
  role?: string | null;
  company_id?: string | null;
  full_name?: string | null;
  email?: string | null;
};

type CreatedCompany = {
  id: string;
  name: string;
  code: string;
};

const bossRoles = new Set(['boss', 'manager', 'admin', 'supervisor', 'owner']);

export default function CompanyOnboardingPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [account, setAccount] = useState<AccountRow | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [createdCompany, setCreatedCompany] = useState<CreatedCompany | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const rawRole = account?.role?.toLowerCase().trim() || 'guard';
  const isBoss = bossRoles.has(rawRole);

  useEffect(() => {
    let mounted = true;

    const loadAccount = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.replace('/login');
        return;
      }

      const { data, error: accountError } = await supabase
        .from('users')
        .select('id,role,company_id,full_name,email')
        .eq('id', session.user.id)
        .maybeSingle();

      if (!mounted) return;

      if (accountError || !data) {
        router.replace('/choose-role');
        return;
      }

      if (data.company_id) {
        router.replace(routeForRole(normalizeProfileRole(data.role)));
        return;
      }

      if (!bossRoles.has(String(data.role ?? '').toLowerCase())) {
        setAccount(data);
        setLoading(false);
        return;
      }

      await fetch('/api/choose-role', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ role: 'boss' }),
      });

      setAccount({ ...data, role: 'boss' });
      setLoading(false);
    };

    void loadAccount();

    return () => {
      mounted = false;
    };
  }, [router, supabase]);

  const handleCreateCompany = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!account?.id || !companyName.trim()) {
      setError('Enter a company name.');
      return;
    }

    setSubmitting(true);

    await fetch('/api/choose-role', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ role: 'boss' }),
    });

    const { data, error: rpcError } = await supabase.rpc('create_company_for_boss', {
      p_boss_user_id: account.id,
      p_company_name: companyName.trim(),
    });

    setSubmitting(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    const row = Array.isArray(data) ? data[0] : data;
    setCreatedCompany({
      id: row?.company_id || row?.id,
      name: row?.company_name || companyName.trim(),
      code: row?.company_code || '',
    });
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-4 text-sm text-slate-600 shadow-sm">
          Loading your account...
        </div>
      </main>
    );
  }

  if (createdCompany) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
        <section className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-8 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-green-100 text-green-700">
              <CheckCircle2 className="h-6 w-6" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-green-700">Workspace ready</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                {createdCompany.name} is live
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Your manager workspace is set up. Invite your team next so lifeguards can start logging pool tests.
              </p>
              {createdCompany.code ? (
                <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  Internal company code: <strong>{createdCompany.code}</strong>
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link
              href="/management/team"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
            >
              <Mail className="h-4 w-4" />
              Invite your team
            </Link>
            <Link
              href="/management/pools/new"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
            >
              <Plus className="h-4 w-4" />
              Add your first pool
            </Link>
          </div>

          <Link
            href="/management/dashboard"
            className="mt-4 inline-flex h-10 items-center justify-center gap-2 text-sm font-semibold text-blue-700 hover:underline"
          >
            <Waves className="h-4 w-4" />
            Go to manager dashboard
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-8 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Workspace setup</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
          {isBoss ? 'Create your company' : 'Join through an invite'}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {isBoss
            ? 'This creates your ChemDeck company workspace. You can invite lifeguards by email right after.'
            : 'Lifeguard accounts join through an email invite from a supervisor — no company codes needed.'}
        </p>

        {isBoss ? (
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
              {submitting ? 'Creating...' : 'Create company'}
            </button>
          </form>
        ) : (
          <div className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-700">
            <p>Open the invite email from your supervisor and follow the link to create your account.</p>
            <p>ChemDeck adds you to their company automatically when you accept the invite.</p>
            <Link
              href="/login"
              className="inline-flex h-10 items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
            >
              Back to sign in
            </Link>
          </div>
        )}

        {error ? (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>
        ) : null}

        <div className="mt-6">
          <Link
            href="/login"
            className="text-sm font-semibold text-slate-500 hover:text-slate-800"
          >
            Back to sign in
          </Link>
        </div>
      </section>
    </main>
  );
}

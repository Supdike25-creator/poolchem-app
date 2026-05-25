'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Edit3, Plus, Shield, Waves } from 'lucide-react';
import { useDevCompany } from '@/components/dev/DevCompanyContext';

export type DevCompanyOption = {
  id: string;
  company_name: string;
  company_code?: string | null;
};

export default function DevBranchingPanel({
  companies,
  initialCompanyId,
}: {
  companies: DevCompanyOption[];
  initialCompanyId?: string;
}) {
  const router = useRouter();
  const { selectedCompanyId, setSelectedCompanyId, hydrated } = useDevCompany();
  const [perspective, setPerspective] = useState<'boss' | 'lifeguard' | ''>('');
  const [companyName, setCompanyName] = useState('');
  const [companyCode, setCompanyCode] = useState('');
  const renameRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [savingAction, setSavingAction] = useState<string | null>(null);

  const activeCompanyId = initialCompanyId || (hydrated ? selectedCompanyId : '');

  useEffect(() => {
    if (!hydrated) return;

    if (initialCompanyId) {
      if (selectedCompanyId !== initialCompanyId) {
        setSelectedCompanyId(initialCompanyId);
      }
      return;
    }

    if (selectedCompanyId) {
      router.replace(`/dev-dashboard?companyId=${encodeURIComponent(selectedCompanyId)}`, { scroll: false });
    }
  }, [hydrated, initialCompanyId, selectedCompanyId, router, setSelectedCompanyId]);

  const selectedCompany = useMemo(
    () => companies.find((company) => company.id === activeCompanyId) ?? null,
    [activeCompanyId, companies],
  );

  const runCompanyAction = async (
    action: 'create-company' | 'rename-company' | 'change-code',
    payload: Record<string, string | null>,
  ) => {
    setSavingAction(action);
    setError('');
    setMessage('');

    try {
      const response = await fetch('/api/dev/admin', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          scope: 'company',
          action,
          id: activeCompanyId || null,
          ...payload,
        }),
      });
      const raw = await response.text();
      let data: { ok?: boolean; message?: string; details?: { id?: string } } | null = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        throw new Error(response.ok ? 'Unexpected server response.' : `Request failed (${response.status}).`);
      }

      if (!response.ok || data?.ok === false) {
        throw new Error(data?.message || 'Company action failed.');
      }

      setMessage(data?.message || 'Company updated.');
      if (action === 'create-company') {
        setCompanyName('');
        setCompanyCode('');
        const createdId = data?.details?.id;
        if (createdId) {
          setSelectedCompanyId(createdId);
          router.replace(`/dev-dashboard?companyId=${encodeURIComponent(createdId)}`, { scroll: false });
        } else {
          router.refresh();
        }
      } else {
        router.refresh();
      }
    } catch (caughtError) {
      setError((caughtError as Error).message);
    } finally {
      setSavingAction(null);
    }
  };

  const choosePerspective = (nextPerspective: 'boss' | 'lifeguard') => {
    if (!activeCompanyId) return;
    setPerspective(nextPerspective);
    const route = nextPerspective === 'boss' ? '/boss-view' : '/worker-view';
    router.push(`${route}?companyId=${encodeURIComponent(activeCompanyId)}`);
  };

  return (
    <section className="mb-6 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-slate-500" />
          <h2 className="text-lg font-semibold text-slate-950">Choose a company to inspect</h2>
        </div>
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {companies.length === 0 ? (
            <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-500 md:col-span-2">
              No companies found.
            </p>
          ) : (
            companies.map((company) => {
              const selected = company.id === activeCompanyId;
              return (
                <button
                  key={company.id}
                  type="button"
                  onClick={() => {
                    setSelectedCompanyId(company.id);
                    setPerspective('');
                    router.replace(`/dev-dashboard?companyId=${encodeURIComponent(company.id)}`, { scroll: false });
                  }}
                  className={`rounded-md border px-3 py-3 text-left transition ${
                    selected
                      ? 'border-blue-300 bg-blue-50 text-blue-950 shadow-sm'
                      : 'border-slate-200 bg-slate-50 text-slate-800 hover:border-slate-300 hover:bg-white'
                  }`}
                >
                  <p className="text-sm font-semibold">{company.company_name}</p>
                  <p className="mt-1 font-mono text-xs opacity-70">{company.company_code ?? company.id}</p>
                </button>
              );
            })
          )}
        </div>

        <div className="mt-5 grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-900">Create company</h3>
          </div>
          <div className="grid gap-2 md:grid-cols-[1fr_160px_auto]">
            <input
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
              placeholder="Company name"
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
            <input
              value={companyCode}
              onChange={(event) => setCompanyCode(event.target.value.toUpperCase())}
              placeholder="Code optional"
              className="h-10 rounded-md border border-slate-200 bg-white px-3 font-mono text-sm text-slate-950 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
            <button
              type="button"
              disabled={savingAction === 'create-company' || !companyName.trim()}
              onClick={() => runCompanyAction('create-company', { company_name: companyName, company_code: companyCode || null })}
              className="inline-flex h-10 items-center justify-center rounded-md bg-slate-950 px-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {savingAction === 'create-company' ? 'Creating' : 'Create'}
            </button>
          </div>
        </div>

        <div className="mt-3 grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center gap-2">
            <Edit3 className="h-4 w-4 text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-900">Selected company controls</h3>
          </div>
          <div className="grid gap-2 md:grid-cols-[1fr_auto]">
            <input
              key={`rename-${activeCompanyId}`}
              ref={renameRef}
              defaultValue={selectedCompany?.company_name ?? ''}
              placeholder="Rename selected company"
              disabled={!selectedCompany}
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
            />
            <button
              type="button"
              disabled={!selectedCompany || savingAction === 'rename-company'}
              onClick={() => runCompanyAction('rename-company', { company_name: renameRef.current?.value ?? '' })}
              className="inline-flex h-10 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {savingAction === 'rename-company' ? 'Renaming' : 'Rename'}
            </button>
          </div>
          <div className="grid gap-2 md:grid-cols-[1fr_auto]">
            <input
              key={`code-${activeCompanyId}`}
              ref={codeRef}
              defaultValue={selectedCompany?.company_code ?? ''}
              placeholder="Change selected company code"
              disabled={!selectedCompany}
              className="h-10 rounded-md border border-slate-200 bg-white px-3 font-mono text-sm text-slate-950 uppercase outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
            />
            <button
              type="button"
              disabled={!selectedCompany || savingAction === 'change-code'}
              onClick={() => runCompanyAction('change-code', { company_code: (codeRef.current?.value ?? '').toUpperCase() })}
              className="inline-flex h-10 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {savingAction === 'change-code' ? 'Saving' : 'Change code'}
            </button>
          </div>
          {message ? <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm font-semibold text-green-700">{message}</p> : null}
          {error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p> : null}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-slate-500" />
          <h2 className="text-lg font-semibold text-slate-950">Choose a perspective</h2>
        </div>
        <p className="mt-2 text-sm text-slate-500">
          {selectedCompany ? `Inspecting ${selectedCompany.company_name}` : 'Select a company before choosing a POV.'}
        </p>
        <div className="mt-4 grid gap-2">
          <button
            type="button"
            disabled={!activeCompanyId}
            onClick={() => choosePerspective('boss')}
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold transition ${
              perspective === 'boss'
                ? 'border-blue-300 bg-blue-50 text-blue-800'
                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45'
            }`}
          >
            <Shield className="h-4 w-4" />
            Boss POV
          </button>
          <button
            type="button"
            disabled={!activeCompanyId}
            onClick={() => choosePerspective('lifeguard')}
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold transition ${
              perspective === 'lifeguard'
                ? 'border-blue-300 bg-blue-50 text-blue-800'
                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45'
            }`}
          >
            <Waves className="h-4 w-4" />
            Lifeguard POV
          </button>
        </div>
      </div>
    </section>
  );
}

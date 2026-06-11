'use client';

import Link from 'next/link';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Building2,
  ClipboardCopy,
  Edit3,
  ExternalLink,
  Plus,
  RefreshCw,
  Shield,
  Trash2,
  Users,
  Waves,
} from 'lucide-react';
import { useDevCompany } from '@/components/dev/DevCompanyContext';
import { isUuid } from '@/lib/devCompanyScope';
import type { DevCompanySummary } from '@/lib/devCompanySummary';

export type DevCompanyOption = {
  id: string;
  company_name: string;
  company_code?: string | null;
};

function resolveCompanyId(raw: string | null | undefined, companies: DevCompanyOption[]) {
  const value = raw?.trim();
  if (!value) return '';
  const byId = companies.find((company) => company.id === value);
  if (byId) return byId.id;
  const byCode = companies.find(
    (company) => company.company_code?.trim().toUpperCase() === value.toUpperCase(),
  );
  if (byCode) return byCode.id;
  return isUuid(value) ? value : '';
}

function DevBranchingPanelInner({
  companies,
  initialCompanyId,
}: {
  companies: DevCompanyOption[];
  initialCompanyId?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selectedCompanyId, setSelectedCompanyId, hydrated } = useDevCompany();

  const urlCompanyId = searchParams.get('companyId');
  const resolvedInitial = resolveCompanyId(initialCompanyId || urlCompanyId, companies);
  const [activeCompanyId, setActiveCompanyId] = useState(resolvedInitial);
  const [perspective, setPerspective] = useState<'manager' | 'employee' | ''>('');
  const [companyName, setCompanyName] = useState('');
  const [companyCode, setCompanyCode] = useState('');
  const [renameValue, setRenameValue] = useState('');
  const [codeValue, setCodeValue] = useState('');
  const [filter, setFilter] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [savingAction, setSavingAction] = useState<string | null>(null);
  const [summary, setSummary] = useState<DevCompanySummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const selectedCompany = useMemo(
    () => companies.find((company) => company.id === activeCompanyId) ?? null,
    [activeCompanyId, companies],
  );

  const filteredCompanies = useMemo(() => {
    const query = filter.trim().toLowerCase();
    if (!query) return companies;
    return companies.filter(
      (company) =>
        company.company_name.toLowerCase().includes(query) ||
        company.company_code?.toLowerCase().includes(query) ||
        company.id.toLowerCase().includes(query),
    );
  }, [companies, filter]);

  const syncSelection = useCallback(
    (companyId: string, updateUrl = true) => {
      if (!companyId) return;
      setActiveCompanyId(companyId);
      setPerspective('');
      setSelectedCompanyId(companyId);
      if (updateUrl) {
        router.push(`/dev-dashboard?companyId=${encodeURIComponent(companyId)}`, { scroll: false });
      }
    },
    [router, setSelectedCompanyId],
  );

  useEffect(() => {
    if (!hydrated) return;

    const fromUrl = resolveCompanyId(urlCompanyId, companies);
    const fromInitial = resolveCompanyId(initialCompanyId, companies);
    const fromStorage = resolveCompanyId(selectedCompanyId, companies);
    const nextId = fromUrl || fromInitial || fromStorage;

    if (!nextId) return;

    setActiveCompanyId((current) => (current === nextId ? current : nextId));
    if (fromStorage !== nextId) {
      setSelectedCompanyId(nextId);
    }
  }, [hydrated, urlCompanyId, initialCompanyId, selectedCompanyId, companies, setSelectedCompanyId]);

  useEffect(() => {
    setRenameValue(selectedCompany?.company_name ?? '');
    setCodeValue(selectedCompany?.company_code ?? '');
  }, [selectedCompany?.company_name, selectedCompany?.company_code, activeCompanyId]);

  const loadSummary = useCallback(async () => {
    if (!activeCompanyId) {
      setSummary(null);
      return;
    }

    setSummaryLoading(true);
    try {
      const response = await fetch(`/api/dev/company-summary?companyId=${encodeURIComponent(activeCompanyId)}`, {
        cache: 'no-store',
        credentials: 'same-origin',
      });
      const data = await response.json().catch(() => null);
      if (response.ok && data?.ok) {
        setSummary(data.summary as DevCompanySummary);
      } else {
        setSummary(null);
      }
    } catch {
      setSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  }, [activeCompanyId]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const runCompanyAction = async (
    action: 'create-company' | 'rename-company' | 'change-code' | 'delete-company' | 'add-pool',
    payload: Record<string, string | null> = {},
  ) => {
    setSavingAction(action);
    setError('');
    setMessage('');

    try {
      const response = await fetch('/api/dev/admin', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          scope: 'company',
          action,
          id: activeCompanyId || null,
          ...payload,
        }),
      });
      const raw = await response.text();
      let data: {
        ok?: boolean;
        message?: string;
        details?: { id?: string; company_name?: string; company_code?: string };
      } | null = null;
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
          syncSelection(createdId);
        }
        router.refresh();
        return;
      }

      if (action === 'delete-company') {
        setActiveCompanyId('');
        setSelectedCompanyId('');
        setSummary(null);
        router.push('/dev-dashboard');
        router.refresh();
        return;
      }

      if (data?.details?.company_name) {
        setRenameValue(data.details.company_name);
      }
      if (data?.details?.company_code) {
        setCodeValue(data.details.company_code);
      }

      await loadSummary();
      router.refresh();
    } catch (caughtError) {
      setError((caughtError as Error).message);
    } finally {
      setSavingAction(null);
    }
  };

  const choosePerspective = (nextPerspective: 'manager' | 'employee') => {
    if (!activeCompanyId) return;
    setPerspective(nextPerspective);
    const route = nextPerspective === 'manager' ? '/manager-view' : '/worker-view';
    router.push(`${route}?companyId=${encodeURIComponent(activeCompanyId)}`);
  };

  const copyText = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setMessage(`${label} copied to clipboard.`);
      setError('');
    } catch {
      setError(`Unable to copy ${label.toLowerCase()}.`);
    }
  };

  return (
    <>
    <section className="mb-6 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-slate-500" />
            <h2 className="text-lg font-semibold text-slate-950">Choose a company to inspect</h2>
          </div>
          <input
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Search companies"
            className="h-9 w-full max-w-xs rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {filteredCompanies.length === 0 ? (
            <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-500 md:col-span-2">
              No companies match your search.
            </p>
          ) : (
            filteredCompanies.map((company) => {
              const selected = company.id === activeCompanyId;
              return (
                <button
                  key={company.id}
                  type="button"
                  onClick={() => syncSelection(company.id)}
                  aria-pressed={selected}
                  className={`rounded-md border px-3 py-3 text-left transition ${
                    selected
                      ? 'border-blue-400 bg-blue-50 text-blue-950 shadow-[inset_0_0_0_1px_rgba(37,99,235,0.15)]'
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

        {selectedCompany ? (
          <div className="mt-4 rounded-md border border-blue-200 bg-blue-50/70 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">Selected company</p>
                <p className="mt-1 text-lg font-semibold text-slate-950">{selectedCompany.company_name}</p>
                <p className="mt-1 font-mono text-sm text-slate-700">Code: {selectedCompany.company_code}</p>
                <p className="mt-1 font-mono text-xs text-slate-500">{selectedCompany.id}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void copyText('Company code', selectedCompany.company_code ?? '')}
                  className="inline-flex h-9 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold"
                >
                  <ClipboardCopy className="h-3.5 w-3.5" />
                  Copy code
                </button>
                <button
                  type="button"
                  onClick={() => void loadSummary()}
                  disabled={summaryLoading}
                  className="inline-flex h-9 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${summaryLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
            </div>

            {summary ? (
              <div className="mt-4 grid gap-2 sm:grid-cols-4">
                {[
                  ['Users', summary.user_count],
                  ['Employees', summary.guard_count],
                  ['Managers', summary.manager_count],
                  ['Pools', summary.pool_count],
                  ['Logs', summary.log_count],
                  ['News', summary.announcement_count],
                  ['Alerts', summary.alert_count],
                ].map(([label, value]) => (
                  <div key={label as string} className="rounded-md border border-white/80 bg-white px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
                    <p className="text-lg font-semibold text-slate-950">{value}</p>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={`/manager-view?companyId=${encodeURIComponent(activeCompanyId)}`}
                className="inline-flex h-9 items-center gap-1 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Manager POV
              </Link>
              <Link
                href={`/management/pools?companyId=${encodeURIComponent(activeCompanyId)}`}
                className="inline-flex h-9 items-center gap-1 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold"
              >
                <Waves className="h-3.5 w-3.5" />
                Manager pools
              </Link>
              <Link
                href={`/worker-view?companyId=${encodeURIComponent(activeCompanyId)}`}
                className="inline-flex h-9 items-center gap-1 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Employee POV
              </Link>
              <Link
                href="/dev-admin/companies"
                className="inline-flex h-9 items-center gap-1 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold"
              >
                <Building2 className="h-3.5 w-3.5" />
                Admin companies
              </Link>
              <Link
                href="/dev-admin/pools"
                className="inline-flex h-9 items-center gap-1 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold"
              >
                <Waves className="h-3.5 w-3.5" />
                Admin pools
              </Link>
              <Link
                href="/dev-admin/profiles"
                className="inline-flex h-9 items-center gap-1 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold"
              >
                <Users className="h-3.5 w-3.5" />
                Admin profiles
              </Link>
            </div>
          </div>
        ) : null}

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
              onClick={() =>
                void runCompanyAction('create-company', {
                  company_name: companyName,
                  company_code: companyCode || null,
                })
              }
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
              value={renameValue}
              onChange={(event) => setRenameValue(event.target.value)}
              placeholder="Rename selected company"
              disabled={!selectedCompany}
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
            />
            <button
              type="button"
              disabled={!selectedCompany || savingAction === 'rename-company'}
              onClick={() => void runCompanyAction('rename-company', { company_name: renameValue })}
              className="inline-flex h-10 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {savingAction === 'rename-company' ? 'Renaming' : 'Rename'}
            </button>
          </div>
          <div className="grid gap-2 md:grid-cols-[1fr_auto]">
            <input
              value={codeValue}
              onChange={(event) => setCodeValue(event.target.value.toUpperCase())}
              placeholder="Change selected company code"
              disabled={!selectedCompany}
              className="h-10 rounded-md border border-slate-200 bg-white px-3 font-mono text-sm uppercase text-slate-950 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
            />
            <button
              type="button"
              disabled={!selectedCompany || savingAction === 'change-code'}
              onClick={() => void runCompanyAction('change-code', { company_code: codeValue.trim().toUpperCase() })}
              className="inline-flex h-10 items-center justify-center rounded-md border border-blue-200 bg-blue-50 px-3 text-sm font-semibold text-blue-800 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {savingAction === 'change-code' ? 'Saving' : 'Change code'}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!selectedCompany || savingAction === 'add-pool'}
              onClick={() => void runCompanyAction('add-pool')}
              className="inline-flex h-9 items-center gap-1 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold"
            >
              <Plus className="h-3.5 w-3.5" />
              {savingAction === 'add-pool' ? 'Adding pool…' : 'Add pool'}
            </button>
            <button
              type="button"
              disabled={!selectedCompany || savingAction === 'delete-company'}
              onClick={() => {
                if (!selectedCompany) return;
                setShowDeleteConfirm(true);
              }}
              className="inline-flex h-9 items-center gap-1 rounded-md border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-700"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {savingAction === 'delete-company' ? 'Deleting…' : 'Delete company'}
            </button>
          </div>
          {message ? (
            <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm font-semibold text-green-700">
              {message}
            </p>
          ) : null}
          {error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              {error}
            </p>
          ) : null}
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
            onClick={() => choosePerspective('manager')}
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold transition ${
              perspective === 'manager'
                ? 'border-blue-300 bg-blue-50 text-blue-800'
                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45'
            }`}
          >
            <Shield className="h-4 w-4" />
            Manager POV
          </button>
          <button
            type="button"
            disabled={!activeCompanyId}
            onClick={() => choosePerspective('employee')}
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold transition ${
              perspective === 'employee'
                ? 'border-blue-300 bg-blue-50 text-blue-800'
                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45'
            }`}
          >
            <Waves className="h-4 w-4" />
            Employee POV
          </button>
        </div>

        {selectedCompany ? (
          <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <p className="font-semibold text-slate-900">Quick test checklist</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Open Manager POV and verify dashboard loads.</li>
              <li>Open Employee POV and submit a test log.</li>
              <li>Use Tool Actions below for simulate alert / test chem log.</li>
              <li>Confirm company code works on the join-company screen.</li>
            </ul>
          </div>
        ) : null}
      </div>
    </section>

    {showDeleteConfirm && selectedCompany ? (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-company-title"
        onClick={() => setShowDeleteConfirm(false)}
      >
        <div
          className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-xl"
          onClick={(event) => event.stopPropagation()}
        >
          <h3 id="delete-company-title" className="text-lg font-semibold text-slate-950">
            Delete company?
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Are you sure you want to delete{' '}
            <span className="font-semibold text-slate-900">{selectedCompany.company_name}</span>? This
            removes its pools, chemical logs, invites, and team links. This cannot be undone.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(false)}
              className="inline-flex h-9 items-center rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={savingAction === 'delete-company'}
              onClick={() => {
                setShowDeleteConfirm(false);
                void runCompanyAction('delete-company');
              }}
              className="inline-flex h-9 items-center gap-1 rounded-md border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-700 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {savingAction === 'delete-company' ? 'Deleting…' : 'Delete company'}
            </button>
          </div>
        </div>
      </div>
    ) : null}
    </>
  );
}

export default function DevBranchingPanel(props: {
  companies: DevCompanyOption[];
  initialCompanyId?: string;
}) {
  return (
    <Suspense
      fallback={
        <div className="mb-6 rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">
          Loading company controls…
        </div>
      }
    >
      <DevBranchingPanelInner {...props} />
    </Suspense>
  );
}

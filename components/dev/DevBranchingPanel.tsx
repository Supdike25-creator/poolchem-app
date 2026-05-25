'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Shield, Waves } from 'lucide-react';
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
  const { selectedCompanyId, setSelectedCompanyId } = useDevCompany();
  const [perspective, setPerspective] = useState<'boss' | 'lifeguard' | ''>('');

  useEffect(() => {
    if (initialCompanyId) setSelectedCompanyId(initialCompanyId);
  }, [initialCompanyId, setSelectedCompanyId]);

  const activeCompanyId = selectedCompanyId || initialCompanyId || '';
  const selectedCompany = useMemo(
    () => companies.find((company) => company.id === activeCompanyId) ?? null,
    [activeCompanyId, companies],
  );

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

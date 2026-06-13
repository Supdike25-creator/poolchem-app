'use client';

import { useEffect, useState } from 'react';
import AdminActionPanel from '@/components/dev/AdminActionPanel';
import type { AdminCompany } from '@/lib/devAdmin';

export default function CompanyAdminCard({ company: initialCompany }: { company: AdminCompany }) {
  const [company, setCompany] = useState(initialCompany);

  useEffect(() => {
    setCompany(initialCompany);
  }, [initialCompany]);

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">{company.company_name}</h2>
          <div className="mt-2 grid gap-2 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-5">
            <span>
              Code: <strong className="text-slate-900">{company.company_code}</strong>
            </span>
            <span>
              Created by: <span className="font-mono text-xs">{company.created_by ?? '-'}</span>
            </span>
            <span>Users: {company.user_count}</span>
            <span>Pools: {company.pool_count}</span>
            <span className="font-mono text-xs">ID: {company.id}</span>
          </div>
        </div>
        <AdminActionPanel
          scope="company"
          id={company.id}
          currentCode={company.company_code}
          displayName={company.company_name}
          onActionComplete={(action, result) => {
            const details = result.details as { company_name?: string; company_code?: string } | undefined;
            if (result.ok && details?.company_code) {
              setCompany((current) => ({
                ...current,
                company_name: details.company_name ?? current.company_name,
                company_code: details.company_code ?? current.company_code,
              }));
            }
            if (result.ok && (action === 'add-pool' || action === 'delete-company')) {
              window.location.reload();
            }
          }}
        />
      </div>
    </article>
  );
}

'use client';

import { useState } from 'react';
import { SectionCard, buttonClass } from '@/components/OperationsUI';

type CreateResult = {
  ok?: boolean;
  message?: string;
  details?: {
    id?: string;
    company_name?: string;
    company_code?: string;
  };
};

export default function CreateCompanyForm() {
  const [companyName, setCompanyName] = useState('');
  const [companyCode, setCompanyCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<CreateResult | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setResult(null);

    try {
      const response = await fetch('/api/dev/admin', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          scope: 'company',
          action: 'create-company',
          company_name: companyName,
          company_code: companyCode.trim() || undefined,
        }),
      });

      const data = (await response.json().catch(() => null)) as CreateResult | null;
      if (!response.ok || !data?.ok) {
        setResult({ ok: false, message: data?.message || 'Unable to create company.' });
        return;
      }

      setResult(data);
      setCompanyName('');
      setCompanyCode('');
      window.setTimeout(() => window.location.reload(), 1200);
    } catch (error) {
      setResult({ ok: false, message: (error as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SectionCard className="mb-5 p-5">
      <h2 className="text-base font-semibold text-slate-950">Add Company</h2>
      <p className="mt-1 text-sm text-slate-600">
        Create a new company workspace. A join code is generated automatically if you leave the code blank.
      </p>

      <form onSubmit={(event) => void handleSubmit(event)} className="mt-4 grid gap-4 lg:grid-cols-[1fr_160px_auto] lg:items-end">
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-slate-700">Company name</span>
          <input
            value={companyName}
            onChange={(event) => setCompanyName(event.target.value)}
            placeholder="Example Pool Services"
            required
            className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-slate-700">Code (optional)</span>
          <input
            value={companyCode}
            onChange={(event) => setCompanyCode(event.target.value.toUpperCase())}
            placeholder="TEST1"
            className="h-10 w-full rounded-lg border border-slate-300 px-3 font-mono text-sm uppercase"
          />
        </label>

        <button type="submit" disabled={submitting || !companyName.trim()} className={buttonClass.primary}>
          {submitting ? 'Creating…' : 'Create company'}
        </button>
      </form>

      {result ? (
        <div
          className={`mt-4 rounded-lg border px-3 py-2 text-sm ${
            result.ok
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {result.ok && result.details?.company_code
            ? `Created ${result.details.company_name} with code ${result.details.company_code}. Refreshing…`
            : result.message}
        </div>
      ) : null}
    </SectionCard>
  );
}

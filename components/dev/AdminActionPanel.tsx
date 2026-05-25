'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { AdminCompany } from '@/lib/devAdmin';

type Result = {
  ok?: boolean;
  message?: string;
  details?: unknown;
};

const RELOAD_ACTIONS = new Set([
  'add-pool',
  'delete-pool',
  'delete-company',
  'change-role',
  'move-company',
  'toggle-active',
  'change-code',
  'rename-company',
  'create-company',
]);

export default function AdminActionPanel({
  scope,
  id,
  companies = [],
}: {
  scope: 'profile' | 'company' | 'pool' | 'system';
  id?: string;
  companies?: AdminCompany[];
}) {
  const [result, setResult] = useState<Result>({});
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (action: string, payload: Record<string, unknown> = {}) => {
    setBusy(action);
    try {
      const response = await fetch('/api/dev/admin', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ scope, action, id, ...payload }),
      });
      const raw = await response.text();
      let data: Result = {};
      try {
        data = raw ? (JSON.parse(raw) as Result) : {};
      } catch {
        setResult({
          ok: false,
          message: response.ok
            ? 'Unexpected server response.'
            : `Request failed (${response.status}). Check server logs.`,
        });
        return;
      }
      if (!response.ok && !data.message) {
        data = { ok: false, message: `Request failed (${response.status}).` };
      }
      setResult(data);
      const details = data.details as { href?: string } | undefined;
      if (data.ok && details?.href) {
        window.location.assign(details.href);
        return;
      }
      if (data.ok && RELOAD_ACTIONS.has(action)) {
        window.setTimeout(() => window.location.reload(), 500);
      }
    } catch (error) {
      setResult({ ok: false, message: (error as Error).message });
    } finally {
      setBusy(null);
    }
  };

  if (scope === 'profile') {
    return (
      <div className="flex flex-wrap gap-2">
        <select
          className="h-9 rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold"
          onChange={(event) => event.target.value && run('change-role', { role: event.target.value })}
          defaultValue=""
        >
          <option value="" disabled>Change role</option>
          <option value="boss">boss</option>
          <option value="guard">guard</option>
          <option value="dev">dev</option>
        </select>
        <select
          className="h-9 rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold"
          onChange={(event) => event.target.value && run('move-company', { company_id: event.target.value })}
          defaultValue=""
        >
          <option value="" disabled>Move company</option>
          {companies.map((company) => (
            <option key={company.id} value={company.id}>{company.company_name}</option>
          ))}
        </select>
        <button className="h-9 rounded-md border border-slate-200 px-2 text-xs font-semibold" disabled={busy === 'reset-password'} onClick={() => run('reset-password')}>
          Reset password
        </button>
        <button className="h-9 rounded-md border border-slate-200 px-2 text-xs font-semibold" disabled={busy === 'toggle-active'} onClick={() => run('toggle-active')}>
          Toggle active
        </button>
        <button className="h-9 rounded-md border border-slate-200 px-2 text-xs font-semibold" disabled={busy === 'impersonate'} onClick={() => run('impersonate')}>
          Impersonate
        </button>
        {result.message ? (
          <div className="w-full space-y-2">
            <span className="text-xs font-semibold text-slate-500">{result.message}</span>
            {result.details ? (
              <pre className="max-h-48 overflow-auto rounded-md bg-slate-950 p-3 text-xs text-slate-100">{JSON.stringify(result.details, null, 2)}</pre>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  if (scope === 'company') {
    return (
      <div className="flex flex-wrap gap-2">
        <button className="h-9 rounded-md border border-slate-200 px-2 text-xs font-semibold" onClick={() => run('add-pool')}>
          Add pool
        </button>
        <button className="h-9 rounded-md border border-slate-200 px-2 text-xs font-semibold" onClick={() => {
          const code = window.prompt('New company code');
          if (code) void run('change-code', { company_code: code });
        }}>
          Change code
        </button>
        <button className="h-9 rounded-md border border-red-200 px-2 text-xs font-semibold text-red-700" onClick={() => run('delete-company')}>
          Delete
        </button>
        <button className="h-9 rounded-md border border-slate-200 px-2 text-xs font-semibold" onClick={() => run('view-users')}>
          View users
        </button>
        {result.message ? (
          <div className="w-full space-y-2">
            <span className="text-xs font-semibold text-slate-500">{result.message}</span>
            {result.details ? (
              <pre className="max-h-48 overflow-auto rounded-md bg-slate-950 p-3 text-xs text-slate-100">{JSON.stringify(result.details, null, 2)}</pre>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  if (scope === 'pool') {
    return (
      <div className="flex flex-wrap items-start gap-2">
        {id ? (
          <Link
            href={`/dev-admin/pools/${id}/edit`}
            className="inline-flex h-9 items-center rounded-md border border-slate-200 px-2 text-xs font-semibold"
          >
            Edit
          </Link>
        ) : null}
        <button className="h-9 rounded-md border border-red-200 px-2 text-xs font-semibold text-red-700" onClick={() => run('delete-pool')}>Delete</button>
        <button className="h-9 rounded-md border border-slate-200 px-2 text-xs font-semibold" onClick={() => run('view-logs')}>View logs</button>
        {result.message ? (
          <div className="w-full space-y-2">
            <span className="text-xs font-semibold text-slate-500">{result.message}</span>
            {result.details ? (
              <pre className="max-h-48 overflow-auto rounded-md bg-slate-950 p-3 text-xs text-slate-100">{JSON.stringify(result.details, null, 2)}</pre>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {[
        ['health', 'Run API health checks'],
        ['simulate-alert', 'Simulate alerts'],
        ['clear-test-data', 'Clear test data'],
        ['toggle-flags', 'Toggle feature flags'],
      ].map(([action, label]) => (
        <button key={action} className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold" onClick={() => run(action)}>
          {label}
        </button>
      ))}
      {result.message ? (
        <pre className="sm:col-span-2 rounded-md bg-slate-950 p-3 text-xs text-slate-100">{JSON.stringify(result, null, 2)}</pre>
      ) : null}
    </div>
  );
}

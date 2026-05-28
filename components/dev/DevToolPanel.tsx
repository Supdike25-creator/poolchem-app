'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Database, FlaskConical, ListTree, Mail, Radio, RotateCcw, ShieldCheck, ToggleLeft, Trash2 } from 'lucide-react';
import type { DevApiRequest, DevFeatureFlag, DevRawLog, DevTableSummary } from '@/lib/devTools';

type ApiResult = {
  ok?: boolean;
  message?: string;
  details?: unknown;
};

export default function DevToolPanel({
  tables,
  initialFlags,
  initialLogs,
  initialRequests,
  selectedCompanyId,
}: {
  tables: DevTableSummary[];
  initialFlags: DevFeatureFlag[];
  initialLogs: DevRawLog[];
  initialRequests: DevApiRequest[];
  selectedCompanyId?: string;
}) {
  const [flags, setFlags] = useState(initialFlags);
  const [rawLogs, setRawLogs] = useState(initialLogs);
  const [apiRequests, setApiRequests] = useState(initialRequests);
  const [result, setResult] = useState<ApiResult>({ message: 'Tools ready.' });
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [resendTestEmail, setResendTestEmail] = useState('supdike25@hotmail.com');
  const [resendConfig, setResendConfig] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    setFlags(initialFlags);
    setRawLogs(initialLogs);
    setApiRequests(initialRequests);
  }, [initialFlags, initialLogs, initialRequests, selectedCompanyId]);

  useEffect(() => {
    void fetch('/api/dev/test-resend-email', { credentials: 'same-origin' })
      .then((response) => response.json())
      .then((data) => {
        if (data?.details) setResendConfig(data.details as Record<string, unknown>);
      })
      .catch(() => undefined);
  }, []);

  const refreshActivity = async () => {
    const query = selectedCompanyId ? `?companyId=${encodeURIComponent(selectedCompanyId)}` : '';
    const response = await fetch(`/api/dev/activity${query}`, { credentials: 'same-origin' });
    const data = await response.json();
    if (data.flags) setFlags(data.flags);
    if (data.logs) setRawLogs(data.logs);
    if (data.requests) setApiRequests(data.requests);
  };

  const toggleFlag = async (flag: DevFeatureFlag) => {
    const nextEnabled = !flag.enabled;
    setFlags((current) => current.map((item) => item.key === flag.key ? { ...item, enabled: nextEnabled } : item));

    try {
      const response = await fetch('/api/dev/feature-flags', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ key: flag.key, enabled: nextEnabled, companyId: selectedCompanyId || null }),
      });
      const data = (await response.json()) as ApiResult & { flags?: DevFeatureFlag[] };
      setResult(data);
      if (data.flags) setFlags(data.flags);
      await refreshActivity();
    } catch (error) {
      setResult({ ok: false, message: (error as Error).message });
      setFlags((current) => current.map((item) => item.key === flag.key ? { ...item, enabled: flag.enabled } : item));
    }
  };

  const runTool = async (action: string, endpoint: string) => {
    setLoadingAction(action);
    setResult({ message: `Running ${action}...` });

    try {
      const query = selectedCompanyId ? `?companyId=${encodeURIComponent(selectedCompanyId)}` : '';
      const response = await fetch(`${endpoint}${query}`, {
        method: endpoint.endsWith('/health') ? 'GET' : 'POST',
        credentials: 'same-origin',
        headers: endpoint.endsWith('/health') ? undefined : { 'content-type': 'application/json' },
        body: endpoint.endsWith('/health') ? undefined : JSON.stringify({ companyId: selectedCompanyId || null }),
      });
      const data = (await response.json()) as ApiResult;
      setResult(data);
      await refreshActivity();
    } catch (error) {
      setResult({ ok: false, message: (error as Error).message });
    } finally {
      setLoadingAction(null);
    }
  };

  const sendResendTestEmail = async () => {
    setLoadingAction('resend-test');
    setResult({ message: 'Sending test invite email via Resend...' });

    try {
      const response = await fetch('/api/dev/test-resend-email', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: resendTestEmail.trim() }),
      });
      const data = (await response.json()) as ApiResult & { details?: Record<string, unknown> };
      setResult(data);
      if (data.details) setResendConfig(data.details);
      await refreshActivity();
    } catch (error) {
      setResult({ ok: false, message: (error as Error).message });
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <ToggleLeft className="h-5 w-5 text-slate-500" />
          <h2 className="text-lg font-semibold text-slate-950">Feature Flags</h2>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {flags.map((flag) => (
            <button
              key={flag.key}
              type="button"
              onClick={() => toggleFlag(flag)}
              className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-left transition hover:border-blue-300 hover:bg-white"
            >
              <span className="text-sm font-semibold text-slate-800">{flag.label}</span>
              <span className={`rounded-full px-2 py-1 text-xs font-semibold ${flag.enabled ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>
                {flag.enabled ? 'On' : 'Off'}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Radio className="h-5 w-5 text-slate-500" />
          <h2 className="text-lg font-semibold text-slate-950">Tool Actions</h2>
        </div>
        {selectedCompanyId ? (
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Scoped to selected company</p>
        ) : (
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-amber-600">Select a company for data-writing tools</p>
        )}
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {[
            { label: 'API health', endpoint: '/api/dev/health', icon: ShieldCheck },
            { label: 'Simulate alert', endpoint: '/api/dev/simulate-alert', icon: AlertTriangle },
            { label: 'Test chem log', endpoint: '/api/dev/test-chem-log', icon: FlaskConical },
            { label: 'Clear test data', endpoint: '/api/dev/clear-test-data', icon: Trash2 },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.endpoint}
                type="button"
                onClick={() => runTool(item.label, item.endpoint)}
                disabled={loadingAction === item.label || (!selectedCompanyId && item.endpoint !== '/api/dev/health')}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Icon className="h-4 w-4" />
                {loadingAction === item.label ? 'Running' : item.label}
              </button>
            );
          })}
        </div>
        <div className="mt-4 rounded-md border border-slate-200 bg-slate-950 p-3 text-sm text-slate-100">
          <p className="font-semibold">{result.ok === false ? 'Tool failed' : 'Tool result'}</p>
          <pre className="mt-2 max-h-36 overflow-auto whitespace-pre-wrap text-xs leading-5 text-slate-300">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-slate-500" />
          <h2 className="text-lg font-semibold text-slate-950">Resend email test</h2>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          Send a test invite email through Resend. In test mode, only <strong>supdike25@hotmail.com</strong> can receive mail until you verify a domain.
        </p>
        {resendConfig ? (
          <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            <p><strong>From:</strong> {String(resendConfig.invite_email_from ?? '—')}</p>
            <p><strong>App URL:</strong> {String(resendConfig.app_url ?? '—')}</p>
            <p><strong>API key:</strong> {String(resendConfig.resend_api_key ?? '—')}</p>
          </div>
        ) : null}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="block flex-1 text-sm">
            <span className="mb-1 block font-semibold text-slate-700">Test recipient</span>
            <input
              type="email"
              value={resendTestEmail}
              onChange={(event) => setResendTestEmail(event.target.value)}
              className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
            />
          </label>
          <button
            type="button"
            onClick={() => void sendResendTestEmail()}
            disabled={loadingAction === 'resend-test' || !resendTestEmail.trim()}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-4 text-sm font-semibold text-blue-800 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Mail className="h-4 w-4" />
            {loadingAction === 'resend-test' ? 'Sending…' : 'Send test email'}
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <ListTree className="h-5 w-5 text-slate-500" />
          <h2 className="text-lg font-semibold text-slate-950">Raw Logs</h2>
        </div>
        <div className="mt-4 space-y-2">
          {rawLogs.length === 0 ? (
            <p className="rounded-md bg-slate-950 px-3 py-2 font-mono text-xs text-slate-200">[dev] No raw log rows yet.</p>
          ) : (
            rawLogs.map((line) => (
              <p key={line.id ?? line.message} className="rounded-md bg-slate-950 px-3 py-2 font-mono text-xs text-slate-200">
                [{line.level}] {line.message}
              </p>
            ))
          )}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <RotateCcw className="h-5 w-5 text-slate-500" />
          <h2 className="text-lg font-semibold text-slate-950">API Requests</h2>
        </div>
        <div className="mt-4 divide-y divide-slate-200 rounded-md border border-slate-200">
          {apiRequests.length === 0 ? (
            <p className="px-3 py-4 text-sm text-slate-500">No API requests logged yet.</p>
          ) : apiRequests.map((request) => (
            <div key={request.id ?? `${request.method}-${request.path}-${request.created_at}`} className="grid grid-cols-[64px_1fr_56px] gap-3 px-3 py-2 text-sm">
              <span className="font-mono font-semibold text-slate-500">{request.method}</span>
              <span className="min-w-0 truncate font-mono text-slate-800">{request.path}</span>
              <span className={`text-right font-semibold ${request.status >= 400 ? 'text-red-700' : 'text-green-700'}`}>{request.status}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-slate-500" />
          <h2 className="text-lg font-semibold text-slate-950">Database Tables</h2>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {tables.map((table) => (
            <span key={table.name} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-semibold text-slate-700">
              {table.name}: {table.count ?? table.status}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

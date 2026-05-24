'use client';

import { useState } from 'react';
import { AlertTriangle, Database, FlaskConical, ListTree, Radio, RotateCcw, ShieldCheck, ToggleLeft, Trash2 } from 'lucide-react';

type ApiResult = {
  ok?: boolean;
  message?: string;
  details?: unknown;
};

const featureFlagDefaults = [
  { key: 'newLogFlow', label: 'New log flow', enabled: true },
  { key: 'managerAlerts', label: 'Manager alerts', enabled: true },
  { key: 'strictChemRanges', label: 'Strict chem ranges', enabled: false },
  { key: 'photoReview', label: 'Photo review', enabled: true },
];

const rawLogs = [
  '[dev] auth route mounted for ChemDeckDev',
  '[api] /api/dev/health returned healthy',
  '[db] profiles role policy accepts dev',
  '[alerts] simulated ORP drift event queued',
];

const apiRequests = [
  { method: 'GET', path: '/api/dev/health', status: 200 },
  { method: 'POST', path: '/api/dev/simulate-alert', status: 202 },
  { method: 'POST', path: '/api/dev/test-chem-log', status: 201 },
  { method: 'POST', path: '/api/dev/clear-test-data', status: 200 },
];

export default function DevToolPanel({ tables }: { tables: string[] }) {
  const [flags, setFlags] = useState(featureFlagDefaults);
  const [result, setResult] = useState<ApiResult>({ message: 'Tools ready.' });
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const runTool = async (action: string, endpoint: string) => {
    setLoadingAction(action);
    setResult({ message: `Running ${action}...` });

    try {
      const response = await fetch(endpoint, { method: endpoint.endsWith('/health') ? 'GET' : 'POST' });
      const data = (await response.json()) as ApiResult;
      setResult(data);
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
              onClick={() => {
                setFlags((current) => current.map((item) => item.key === flag.key ? { ...item, enabled: !item.enabled } : item));
              }}
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
                disabled={loadingAction === item.label}
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

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <ListTree className="h-5 w-5 text-slate-500" />
          <h2 className="text-lg font-semibold text-slate-950">Raw Logs</h2>
        </div>
        <div className="mt-4 space-y-2">
          {rawLogs.map((line) => (
            <p key={line} className="rounded-md bg-slate-950 px-3 py-2 font-mono text-xs text-slate-200">{line}</p>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <RotateCcw className="h-5 w-5 text-slate-500" />
          <h2 className="text-lg font-semibold text-slate-950">API Requests</h2>
        </div>
        <div className="mt-4 divide-y divide-slate-200 rounded-md border border-slate-200">
          {apiRequests.map((request) => (
            <div key={`${request.method}-${request.path}`} className="grid grid-cols-[64px_1fr_56px] gap-3 px-3 py-2 text-sm">
              <span className="font-mono font-semibold text-slate-500">{request.method}</span>
              <span className="min-w-0 truncate font-mono text-slate-800">{request.path}</span>
              <span className="text-right font-semibold text-green-700">{request.status}</span>
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
            <span key={table} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-semibold text-slate-700">
              {table}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

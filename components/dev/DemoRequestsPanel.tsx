'use client';

import { useEffect, useState } from 'react';
import { CalendarClock, Mail, RefreshCw } from 'lucide-react';
import { formatDemoTopics, type DemoRequestRecord } from '@/lib/demoRequests';

const formatWhen = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
};

export default function DemoRequestsPanel() {
  const [requests, setRequests] = useState<DemoRequestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/dev/demo-requests', { cache: 'no-store', credentials: 'same-origin' });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.message || 'Unable to load demo requests.');
      }
      setRequests(Array.isArray(payload.requests) ? payload.requests : []);
    } catch (caughtError) {
      setError((caughtError as Error).message || 'Unable to load demo requests.');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Marketing</p>
          <h2 className="text-lg font-semibold text-slate-950">Demo requests</h2>
          <p className="mt-1 text-sm text-slate-500">
            Submissions from Schedule Demo on the homepage. Also emailed to ChemdeckCo@gmail.com.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error ? (
        <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">{error}</p>
      ) : null}

      <div className="mt-4 divide-y divide-slate-200 rounded-md border border-slate-200">
        {loading ? (
          <p className="px-3 py-6 text-sm text-slate-500">Loading demo requests…</p>
        ) : requests.length === 0 ? (
          <p className="px-3 py-6 text-sm text-slate-500">
            No demo requests yet. Run <code className="rounded bg-slate-100 px-1">SUPABASE_DEMO_REQUESTS.sql</code> in Supabase if this panel stays empty after submissions.
          </p>
        ) : (
          requests.map((request) => (
            <div key={request.id} className="grid gap-3 px-3 py-4 text-sm lg:grid-cols-[1.1fr_1fr_1fr_auto]">
              <div>
                <p className="flex items-center gap-2 font-semibold text-slate-950">
                  <Mail className="h-4 w-4 text-slate-400" />
                  {request.email}
                </p>
                <p className="mt-1 text-xs text-slate-500">Submitted {formatWhen(request.created_at)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Topics</p>
                <p className="mt-1 text-slate-700">{formatDemoTopics(request.topics)}</p>
              </div>
              <div>
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <CalendarClock className="h-3.5 w-3.5" />
                  Requested time
                </p>
                <p className="mt-1 font-medium text-slate-900">
                  {request.scheduled_label || request.scheduling_notes || 'Not specified'}
                </p>
                {request.scheduling_notes && request.scheduled_label ? (
                  <p className="mt-1 text-xs text-slate-500">Notes: {request.scheduling_notes}</p>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

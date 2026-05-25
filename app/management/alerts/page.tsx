'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, Bell, CheckCheck, Clock3 } from 'lucide-react';
import { EmptyState, PageHeader, SectionCard, StatusBadge, buttonClass, type StatusTone } from '../../../components/OperationsUI';

interface AlertRow {
  id: string;
  pool_id?: string | null;
  pool_name?: string | null;
  chemical_log_id?: string | null;
  severity: string;
  alert_type: string;
  title: string;
  message: string;
  read_at?: string | null;
  created_at: string;
}

const severityTone = (severity: string): StatusTone => {
  if (severity === 'critical') return 'critical';
  if (severity === 'warning') return 'warning';
  return 'neutral';
};

const formatWhen = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
};

export default function ManagementAlertsPage() {
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadAlerts = async () => {
    setLoading(true);
    setError('');

    const response = await fetch('/api/alerts?limit=50', { cache: 'no-store', credentials: 'same-origin' });
    const result = await response.json().catch(() => null);

    if (!response.ok || !result?.ok) {
      setError(result?.message || 'Unable to load alerts.');
      setAlerts([]);
    } else {
      setAlerts(result.alerts ?? []);
    }

    setLoading(false);
  };

  useEffect(() => {
    void loadAlerts();
  }, []);

  const markRead = async (alertId: string) => {
    setBusyId(alertId);
    const response = await fetch('/api/alerts', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ alert_id: alertId }),
    });
    const result = await response.json().catch(() => null);
    setBusyId(null);

    if (!response.ok || !result?.ok) {
      setError(result?.message || 'Unable to mark alert read.');
      return;
    }

    setAlerts((current) =>
      current.map((alert) =>
        alert.id === alertId ? { ...alert, read_at: new Date().toISOString() } : alert,
      ),
    );
  };

  const markAllRead = async () => {
    setBusyId('all');
    const response = await fetch('/api/alerts', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ mark_all_read: true }),
    });
    const result = await response.json().catch(() => null);
    setBusyId(null);

    if (!response.ok || !result?.ok) {
      setError(result?.message || 'Unable to mark alerts read.');
      return;
    }

    setAlerts((current) => current.map((alert) => ({ ...alert, read_at: alert.read_at || new Date().toISOString() })));
  };

  const unreadCount = alerts.filter((alert) => !alert.read_at).length;

  return (
    <div className="pb-24 lg:pb-8">
      <PageHeader
        eyebrow="Operations"
        title="Alerts"
        description="Out-of-range chemistry and missing verification photos from guard submissions."
        icon={<Bell className="h-4 w-4" />}
        actions={
          unreadCount > 0 ? (
            <button type="button" className={buttonClass.secondary} disabled={busyId === 'all'} onClick={() => void markAllRead()}>
              <CheckCheck className="mr-2 h-4 w-4" />
              Mark all read
            </button>
          ) : null
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <SectionCard className="p-5">
          <div className="mb-2 flex items-center gap-2 text-slate-600">
            <Bell className="h-5 w-5" />
            <h2 className="text-sm font-semibold uppercase tracking-wide">Unread</h2>
          </div>
          <p className="text-3xl font-semibold text-slate-950">{unreadCount}</p>
        </SectionCard>
        <SectionCard className="p-5">
          <div className="mb-2 flex items-center gap-2 text-slate-600">
            <AlertCircle className="h-5 w-5" />
            <h2 className="text-sm font-semibold uppercase tracking-wide">Total loaded</h2>
          </div>
          <p className="text-3xl font-semibold text-slate-950">{alerts.length}</p>
        </SectionCard>
        <SectionCard className="p-5">
          <div className="mb-2 flex items-center gap-2 text-slate-600">
            <Clock3 className="h-5 w-5" />
            <h2 className="text-sm font-semibold uppercase tracking-wide">Latest</h2>
          </div>
          <p className="text-sm font-medium text-slate-700">
            {alerts[0] ? formatWhen(alerts[0].created_at) : 'No alerts yet'}
          </p>
        </SectionCard>
      </div>

      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      {loading ? (
        <p className="text-sm text-slate-500">Loading alerts...</p>
      ) : alerts.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-6 w-6" />}
          title="No alerts yet"
          description="Alerts appear when guards submit out-of-range chemistry or miss required photos."
        />
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`rounded-xl border p-4 shadow-sm ${alert.read_at ? 'border-slate-200 bg-white' : 'border-blue-200 bg-blue-50/40'}`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <StatusBadge tone={severityTone(alert.severity)}>{alert.severity}</StatusBadge>
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{alert.alert_type.replace(/_/g, ' ')}</span>
                    {!alert.read_at ? <StatusBadge tone="info">Unread</StatusBadge> : null}
                  </div>
                  <p className="text-sm font-semibold text-slate-950">{alert.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{alert.message}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    {alert.pool_name ? `${alert.pool_name} · ` : ''}
                    {formatWhen(alert.created_at)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {alert.chemical_log_id ? (
                    <Link href={`/management/logs?q=${encodeURIComponent(alert.pool_name || '')}`} className={buttonClass.secondary}>
                      View logs
                    </Link>
                  ) : null}
                  {!alert.read_at ? (
                    <button
                      type="button"
                      className={buttonClass.primary}
                      disabled={busyId === alert.id}
                      onClick={() => void markRead(alert.id)}
                    >
                      Mark read
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

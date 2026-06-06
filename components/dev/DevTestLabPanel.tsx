'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  FlaskConical,
  Loader2,
  Mail,
  Play,
  RefreshCw,
  Route,
  Server,
  XCircle,
} from 'lucide-react';

type DevTestLabLink = {
  label: string;
  url: string;
  description?: string;
};

type EmailPreview = {
  kind: string;
  subject: string;
  html: string;
  text: string;
  links: DevTestLabLink[];
  scenario?: {
    recipient_email: string;
    has_account: boolean;
    links_live: boolean;
  };
};

type RunEntry = {
  id: string;
  at: string;
  label: string;
  ok: boolean;
  message: string;
  details?: unknown;
};

type LabSnapshot = {
  ok: boolean;
  config?: {
    app_url: string;
    invite_email_from: string;
    resend_api_key: string;
    supabase_url: string;
    service_role_configured: boolean;
    resend_configured: boolean;
  };
  company?: { id: string; name: string } | null;
  linked_scenario?: { linkedEmail: string; hasAccount: boolean };
  pending_invites?: Array<{
    id: string;
    email: string;
    token: string;
    expires_at: string;
    invite_link: string;
    sign_in_link: string;
  }>;
  email_previews?: EmailPreview[];
  routes?: Record<string, DevTestLabLink[]>;
  table_health?: Record<string, string>;
  message?: string;
};

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'emails', label: 'Emails' },
  { id: 'invites', label: 'Invites' },
  { id: 'routes', label: 'Routes' },
  { id: 'runner', label: 'Runner' },
] as const;

type TabId = (typeof tabs)[number]['id'];

function copyText(value: string) {
  void navigator.clipboard.writeText(value);
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span className={`inline-block h-2.5 w-2.5 rounded-full ${ok ? 'bg-emerald-500' : 'bg-red-500'}`} />
  );
}

const emailKindLabels: Record<string, string> = {
  invite_unlinked: 'Invite · new user',
  invite_linked: 'Invite · existing user',
  alert: 'Alert',
  announcement: 'Announcement',
  daily_summary: 'Daily summary',
};

export default function DevTestLabPanel({ selectedCompanyId }: { selectedCompanyId?: string }) {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [snapshot, setSnapshot] = useState<LabSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState('invite_unlinked');
  const [testRecipient, setTestRecipient] = useState('supdike25@hotmail.com');
  const [linkedEmail, setLinkedEmail] = useState('supdike25@hotmail.com');
  const [runLog, setRunLog] = useState<RunEntry[]>([]);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (selectedCompanyId) params.set('companyId', selectedCompanyId);
    if (linkedEmail.trim()) params.set('linkedEmail', linkedEmail.trim());
    const value = params.toString();
    return value ? `?${value}` : '';
  }, [linkedEmail, selectedCompanyId]);

  const pushLog = useCallback((entry: Omit<RunEntry, 'id' | 'at'>) => {
    setRunLog((current) => [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        at: new Date().toLocaleTimeString(),
        ...entry,
      },
      ...current,
    ].slice(0, 40));
  }, []);

  const loadSnapshot = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/dev/test-lab${query}`, { credentials: 'same-origin', cache: 'no-store' });
      const raw = await response.text();
      let data: LabSnapshot;
      try {
        data = JSON.parse(raw) as LabSnapshot;
      } catch {
        pushLog({
          label: 'Load test lab',
          ok: false,
          message: response.ok
            ? 'Server returned invalid JSON.'
            : `HTTP ${response.status}: ${raw.slice(0, 200) || response.statusText}`,
        });
        return;
      }
      setSnapshot(data);
      if (!data.ok) {
        pushLog({ label: 'Load test lab', ok: false, message: data.message || 'Failed to load.' });
      }
    } catch (error) {
      pushLog({ label: 'Load test lab', ok: false, message: (error as Error).message });
    } finally {
      setLoading(false);
    }
  }, [pushLog, query]);

  useEffect(() => {
    void loadSnapshot();
  }, [loadSnapshot]);

  const runAction = async (label: string, body: Record<string, unknown>) => {
    setRunning(label);
    try {
      const response = await fetch(`/api/dev/test-lab${query}`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      pushLog({
        label,
        ok: Boolean(data.ok),
        message: data.message || `${response.status}`,
        details: data,
      });
      if (body.action === 'create-test-invite' || body.action === 'send-test-invite') {
        await loadSnapshot();
      }
      return data;
    } catch (error) {
      pushLog({ label, ok: false, message: (error as Error).message });
      return null;
    } finally {
      setRunning(null);
    }
  };

  const emailPreview = useMemo(
    () => snapshot?.email_previews?.find((item) => item.kind === selectedEmail) ?? snapshot?.email_previews?.[0],
    [selectedEmail, snapshot?.email_previews],
  );

  const config = snapshot?.config;
  const configOk = Boolean(
    config?.service_role_configured && config?.resend_configured && config?.app_url && config?.supabase_url !== 'missing',
  );

  return (
    <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 px-5 py-5 text-white sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-cyan-300">
              <FlaskConical className="h-5 w-5" />
              <p className="text-xs font-semibold uppercase tracking-[0.2em]">Dev Test Lab</p>
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">Feature & email pathway tester</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
              Preview every email template, inspect invite links, validate API responses, and open every major route — all in one place.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadSnapshot()}
            disabled={loading}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/15 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-slate-200 bg-slate-50 px-3 py-2 sm:px-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
              activeTab === tab.id
                ? 'bg-white text-slate-950 shadow-sm ring-1 ring-slate-200'
                : 'text-slate-600 hover:bg-white/70 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid gap-0 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 p-5 sm:p-6">
          {loading && !snapshot ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading test lab…
            </div>
          ) : null}

          {activeTab === 'overview' ? (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {[
                  { label: 'App URL', ok: Boolean(config?.app_url), value: config?.app_url ?? '—' },
                  { label: 'Supabase URL', ok: config?.supabase_url !== 'missing', value: config?.supabase_url ?? '—' },
                  { label: 'Service role key', ok: Boolean(config?.service_role_configured), value: config?.service_role_configured ? 'Configured' : 'Missing' },
                  { label: 'Resend API key', ok: Boolean(config?.resend_configured), value: config?.resend_api_key ?? '—' },
                  { label: 'From address', ok: !config?.invite_email_from.includes('resend.dev'), value: config?.invite_email_from ?? '—' },
                  { label: 'Company scope', ok: Boolean(selectedCompanyId), value: snapshot?.company?.name ?? 'None selected' },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center gap-2">
                      <StatusDot ok={item.ok} />
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{item.label}</p>
                    </div>
                    <p className="mt-2 break-all text-sm font-semibold text-slate-900">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-sm font-semibold text-slate-900">Database tables</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {Object.entries(snapshot?.table_health ?? {}).map(([table, status]) => (
                    <span
                      key={table}
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        status === 'ok'
                          ? 'bg-emerald-100 text-emerald-800'
                          : status === 'missing'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {table}: {status}
                    </span>
                  ))}
                </div>
              </div>

              <div className={`rounded-xl border p-4 ${configOk ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
                <p className={`text-sm font-semibold ${configOk ? 'text-emerald-900' : 'text-amber-900'}`}>
                  {configOk ? 'Ready to test live emails and invites' : 'Fix config before live email tests'}
                </p>
                <p className={`mt-1 text-sm ${configOk ? 'text-emerald-800' : 'text-amber-800'}`}>
                  {configOk
                    ? 'Use the Emails and Invites tabs to preview templates and send test messages.'
                    : 'Add SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, INVITE_EMAIL_FROM, and NEXT_PUBLIC_APP_URL in Vercel, then redeploy.'}
                </p>
              </div>
            </div>
          ) : null}

          {activeTab === 'emails' ? (
            <div className="space-y-4">
              <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-[1fr_auto]">
                <label className="block text-sm">
                  <span className="mb-1 block font-semibold text-slate-700">Linked email (existing account test)</span>
                  <input
                    value={linkedEmail}
                    onChange={(event) => setLinkedEmail(event.target.value)}
                    placeholder="email that already has a ChemDeck account"
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Used for the “existing user” invite preview. DB check:{' '}
                    {snapshot?.linked_scenario?.hasAccount ? 'account found' : 'no account found'}.
                  </p>
                </label>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => void loadSnapshot()}
                    disabled={loading}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    Apply email
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {(snapshot?.email_previews ?? []).map((preview) => (
                  <button
                    key={preview.kind}
                    type="button"
                    onClick={() => setSelectedEmail(preview.kind)}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                      selectedEmail === preview.kind
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {emailKindLabels[preview.kind] ?? preview.kind.replaceAll('_', ' ')}
                  </button>
                ))}
              </div>

              {emailPreview ? (
                <>
                  {emailPreview.scenario ? (
                    <div
                      className={`rounded-xl border p-4 ${
                        emailPreview.scenario.links_live
                          ? 'border-emerald-200 bg-emerald-50'
                          : 'border-amber-200 bg-amber-50'
                      }`}
                    >
                      <p className={`text-sm font-semibold ${emailPreview.scenario.links_live ? 'text-emerald-900' : 'text-amber-900'}`}>
                        {emailPreview.scenario.has_account ? 'Existing user scenario' : 'New user scenario'}
                        {' · '}
                        {emailPreview.scenario.recipient_email}
                      </p>
                      <p className={`mt-1 text-sm ${emailPreview.scenario.links_live ? 'text-emerald-800' : 'text-amber-800'}`}>
                        {emailPreview.scenario.links_live
                          ? 'Links use a real pending invite — Open will load the live invite page.'
                          : 'Preview-only token — create a test invite in the Invites tab before opening links.'}
                      </p>
                    </div>
                  ) : null}

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Subject</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{emailPreview.subject}</p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-slate-900">Links in this email</p>
                    {emailPreview.links.map((link) => (
                      <div key={link.url} className="flex flex-col gap-2 rounded-xl border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900">{link.label}</p>
                          {link.description ? <p className="text-xs text-slate-500">{link.description}</p> : null}
                          <p className="mt-1 break-all font-mono text-xs text-slate-600">{link.url}</p>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <button type="button" onClick={() => copyText(link.url)} className="inline-flex h-9 items-center gap-1 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700">
                            <Copy className="h-3.5 w-3.5" /> Copy
                          </button>
                          <a href={link.url} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-3 text-xs font-semibold text-blue-800">
                            <ExternalLink className="h-3.5 w-3.5" /> Open
                          </a>
                          <button
                            type="button"
                            onClick={() => void runAction(`Probe ${link.label}`, { action: 'probe-url', url: link.url })}
                            disabled={running !== null}
                            className="inline-flex h-9 items-center gap-1 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700"
                          >
                            <Play className="h-3.5 w-3.5" /> Probe
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Email preview (HTML)
                    </div>
                    <iframe
                      title="Email preview"
                      srcDoc={emailPreview.html}
                      className="h-[520px] w-full bg-white"
                      sandbox=""
                    />
                  </div>

                  <details className="rounded-xl border border-slate-200 p-4">
                    <summary className="cursor-pointer text-sm font-semibold text-slate-900">Plain text version</summary>
                    <pre className="mt-3 whitespace-pre-wrap text-xs leading-5 text-slate-600">{emailPreview.text}</pre>
                  </details>
                </>
              ) : null}
            </div>
          ) : null}

          {activeTab === 'invites' ? (
            <div className="space-y-4">
              {!selectedCompanyId ? (
                <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  Select a company above to create and validate real invites.
                </p>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-1 block font-semibold text-slate-700">Test recipient</span>
                  <input
                    value={testRecipient}
                    onChange={(event) => setTestRecipient(event.target.value)}
                    className="h-10 w-full rounded-lg border border-slate-200 px-3"
                  />
                </label>
                <div className="flex flex-col justify-end gap-2 sm:flex-row">
                  <button
                    type="button"
                    disabled={!selectedCompanyId || running !== null}
                    onClick={() => void runAction('Create test invite', { action: 'create-test-invite', email: testRecipient })}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 disabled:opacity-50"
                  >
                    <Mail className="h-4 w-4" />
                    Create invite (no send)
                  </button>
                  <button
                    type="button"
                    disabled={!selectedCompanyId || running !== null}
                    onClick={() => void runAction('Send test invite email', { action: 'send-test-invite', email: testRecipient })}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    <Mail className="h-4 w-4" />
                    Send live invite email
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold text-slate-900">Pending invites for this company</p>
                {(snapshot?.pending_invites ?? []).length === 0 ? (
                  <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">No pending invites. Create one above.</p>
                ) : (
                  snapshot?.pending_invites?.map((invite) => (
                    <div key={invite.id} className="rounded-xl border border-slate-200 p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900">{invite.email}</p>
                          <p className="mt-1 text-xs text-slate-500">Expires {new Date(invite.expires_at).toLocaleString()}</p>
                          <p className="mt-2 break-all font-mono text-xs text-slate-600">{invite.invite_link}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => copyText(invite.invite_link)} className="inline-flex h-9 items-center gap-1 rounded-md border border-slate-200 px-3 text-xs font-semibold">
                            <Copy className="h-3.5 w-3.5" /> Copy link
                          </button>
                          <a href={invite.invite_link} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-3 text-xs font-semibold text-blue-800">
                            <ExternalLink className="h-3.5 w-3.5" /> Open invite
                          </a>
                          <button
                            type="button"
                            onClick={() => void runAction(`Validate ${invite.email}`, { action: 'validate-invite', token: invite.token })}
                            disabled={running !== null}
                            className="inline-flex h-9 items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-800"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Validate
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : null}

          {activeTab === 'routes' ? (
            <div className="space-y-6">
              {Object.entries(snapshot?.routes ?? {}).map(([group, links]) => (
                <div key={group}>
                  <p className="mb-3 text-sm font-semibold capitalize text-slate-900">{group.replace('_', ' ')}</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {links.map((link) => (
                      <div key={link.url} className="rounded-xl border border-slate-200 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900">{link.label}</p>
                            {link.description ? <p className="text-xs text-slate-500">{link.description}</p> : null}
                            <p className="mt-1 break-all font-mono text-[11px] text-slate-600">{link.url}</p>
                          </div>
                          <Link href={link.url} className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md border border-slate-200 px-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                            <Route className="h-3.5 w-3.5" /> Go
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {activeTab === 'runner' ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">Run bundled checks for the selected company.</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  { label: 'Send test notification', action: 'send-test-notification', needsCompany: true },
                  { label: 'Create test invite', action: 'create-test-invite', needsCompany: true, email: testRecipient },
                  { label: 'Send test invite email', action: 'send-test-invite', needsCompany: true, email: testRecipient },
                ].map((item) => (
                  <button
                    key={item.action}
                    type="button"
                    disabled={(item.needsCompany && !selectedCompanyId) || running !== null}
                    onClick={() => void runAction(item.label, { action: item.action, email: item.email })}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-800 transition hover:bg-white disabled:opacity-50"
                  >
                    {running === item.label ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                    {item.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500">Results appear in the live log on the right →</p>
            </div>
          ) : null}
        </div>

        <aside className="border-t border-slate-200 bg-slate-950 p-4 lg:border-l lg:border-t-0">
          <div className="flex items-center gap-2 text-slate-300">
            <Server className="h-4 w-4" />
            <p className="text-xs font-semibold uppercase tracking-[0.16em]">Live log</p>
          </div>
          <div className="mt-3 max-h-[720px] space-y-2 overflow-y-auto">
            {runLog.length === 0 ? (
              <p className="text-xs text-slate-500">Run an action to see step-by-step output here.</p>
            ) : (
              runLog.map((entry) => (
                <div key={entry.id} className="rounded-lg border border-slate-800 bg-slate-900 p-3">
                  <div className="flex items-center gap-2">
                    {entry.ok ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                    ) : (
                      <XCircle className="h-4 w-4 shrink-0 text-red-400" />
                    )}
                    <p className="text-xs font-semibold text-slate-200">{entry.label}</p>
                    <span className="ml-auto text-[10px] text-slate-500">{entry.at}</span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-400">{entry.message}</p>
                  {entry.details ? (
                    <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-[10px] leading-4 text-slate-500">
                      {JSON.stringify(entry.details, null, 2)}
                    </pre>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}

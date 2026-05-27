'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, Copy, Link2, Send, Users, Waves } from 'lucide-react';
import { getStoredSession } from '@/lib/appAccounts';
import { useDevCompanyScope } from '@/lib/useDevCompanyScope';
import { EmptyState, PageHeader, SectionCard, StatusBadge, buttonClass } from '../../../components/OperationsUI';

type GuardMember = {
  id: string;
  full_name?: string | null;
  email?: string | null;
  role?: string | null;
  status?: string | null;
};

type PoolOption = {
  id: string;
  name: string;
};

export default function ManagementTeamPage() {
  const { companyId, query } = useDevCompanyScope();
  const [guards, setGuards] = useState<GuardMember[]>([]);
  const [pools, setPools] = useState<PoolOption[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string[]>>({});
  const [pendingMembers, setPendingMembers] = useState<GuardMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [savingGuardId, setSavingGuardId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLinks, setInviteLinks] = useState<{ signup_link?: string; join_link?: string; company_code?: string }>({});
  const [sendingInvite, setSendingInvite] = useState(false);

  const loadTeam = async () => {
    setError('');
    const devSession = getStoredSession()?.role === 'dev';

    if (devSession && !companyId) {
      setGuards([]);
      setPools([]);
      setAssignments({});
      setPendingMembers([]);
      setMessage('Select a company from Dev Dashboard before managing team assignments.');
      setLoading(false);
      return;
    }

    const fetchOptions = { cache: 'no-store' as const, credentials: 'same-origin' as const };
    const [teamResponse, inviteResponse] = await Promise.all([
      fetch(`/api/pool-assignments${query}`, fetchOptions),
      fetch(`/api/team-invite${query}`, fetchOptions),
    ]);
    const result = await teamResponse.json().catch(() => null);
    const inviteResult = await inviteResponse.json().catch(() => null);
    if (!teamResponse.ok || !result?.ok) {
      setMessage(result?.message || 'Unable to load team data.');
      setError(result?.message || 'Unable to load team data.');
      setLoading(false);
      return;
    }

    setGuards(result.guards ?? []);
    setPools(result.pools ?? []);
    setAssignments(result.assignments ?? {});
    setPendingMembers(result.pendingMembers ?? []);
    if (inviteResult?.ok) {
      setInviteLinks({
        signup_link: inviteResult.signup_link,
        join_link: inviteResult.join_link,
        company_code: inviteResult.company_code,
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadTeam();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [companyId, query]);

  const scopeBody = () => ({ companyId });

  const toggleAssignment = (guardId: string, poolId: string) => {
    setAssignments((current) => {
      const existing = new Set(current[guardId] ?? []);
      if (existing.has(poolId)) {
        existing.delete(poolId);
      } else {
        existing.add(poolId);
      }
      return { ...current, [guardId]: Array.from(existing) };
    });
  };

  const saveAssignments = async (guardId: string) => {
    setSavingGuardId(guardId);
    setMessage('');
    const response = await fetch(`/api/pool-assignments${query}`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        ...scopeBody(),
        guard_id: guardId,
        pool_ids: assignments[guardId] ?? [],
      }),
    });
    const result = await response.json().catch(() => null);
    setSavingGuardId(null);
    setMessage(result?.ok ? 'Pool assignments saved.' : result?.message || 'Unable to save assignments.');
  };

  const updateMemberStatus = async (userId: string, status: 'active' | 'pending' | 'inactive') => {
    setMessage('');
    const response = await fetch(`/api/pool-assignments${query}`, {
      method: 'PATCH',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...scopeBody(), user_id: userId, status }),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.ok) {
      setMessage(result?.message || 'Unable to update member status.');
      return;
    }
    await loadTeam();
    setMessage(result.message);
  };

  const copyInviteLink = async () => {
    const link = inviteLinks.signup_link || inviteLinks.join_link;
    if (!link) {
      setMessage('Invite link is not ready yet. Reload the page after selecting a company.');
      return;
    }

    try {
      await navigator.clipboard.writeText(link);
      setMessage('Invite link copied to clipboard.');
    } catch {
      setMessage(`Copy this link manually: ${link}`);
    }
  };

  const sendInviteEmail = async () => {
    setSendingInvite(true);
    setMessage('');
    const response = await fetch(`/api/team-invite${query}`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...scopeBody(), email: inviteEmail }),
    });
    const result = await response.json().catch(() => null);
    setSendingInvite(false);
    if (!response.ok || !result?.ok) {
      setMessage(result?.message || 'Unable to send invite email.');
      return;
    }
    setInviteEmail('');
    setMessage(result.message);
  };

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-xl border border-slate-200 bg-white py-12 shadow-sm">
        <p className="text-sm text-slate-600">Loading team...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Management"
        title="Team & Pool Assignments"
        description="Approve new guards and choose which pools each guard can log."
        icon={<Users className="h-4 w-4" />}
      />

      {message ? (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">{message}</div>
      ) : null}

      {error && !message ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{error}</div>
      ) : null}

      <SectionCard className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <Link2 className="h-4 w-4 text-slate-500" />
          <h2 className="text-base font-semibold text-slate-950">Invite Guards</h2>
        </div>
        <p className="text-sm text-slate-600">
          Share a signup link or email an invite. Guards create an account, enter code{' '}
          <span className="font-semibold text-slate-900">{inviteLinks.company_code || '—'}</span>, then wait for your approval.
        </p>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={() => void copyInviteLink()} className={buttonClass.secondary} disabled={!inviteLinks.signup_link && !inviteLinks.join_link}>
            <Copy className="mr-2 h-4 w-4" />
            Copy invite link
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-slate-700">Email invite</span>
            <input
              type="email"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              placeholder="guard@example.com"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <div className="flex items-end">
            <button
              type="button"
              disabled={sendingInvite || !inviteEmail.trim()}
              onClick={() => void sendInviteEmail()}
              className={buttonClass.primary}
            >
              <Send className="mr-2 h-4 w-4" />
              {sendingInvite ? 'Sending...' : 'Send invite'}
            </button>
          </div>
        </div>
      </SectionCard>

      {pendingMembers.length > 0 ? (
        <SectionCard className="p-5">
          <h2 className="text-base font-semibold text-slate-950">Pending Approval</h2>
          <p className="mt-1 text-sm text-slate-500">These guards joined your company and are waiting for access.</p>
          <div className="mt-4 space-y-3">
            {pendingMembers.map((member) => (
              <div key={member.id} className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-slate-900">{member.full_name || member.email || member.id}</p>
                  <p className="text-sm text-slate-600">{member.email}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => updateMemberStatus(member.id, 'active')}
                    className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => updateMemberStatus(member.id, 'inactive')}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Deny
                  </button>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      ) : null}

      <SectionCard className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <Waves className="h-4 w-4 text-slate-500" />
          <h2 className="text-base font-semibold text-slate-950">Guard Assignments</h2>
        </div>

        {guards.length === 0 ? (
          <EmptyState
            icon={<Users className="h-6 w-6" />}
            title="No guards in this company yet."
            description="Guards will appear here after they join with your company code."
          />
        ) : (
          <div className="space-y-4">
            {guards.map((guard) => {
              const selected = new Set(assignments[guard.id] ?? []);
              const isPending = String(guard.status).toLowerCase() === 'pending';

              return (
                <div key={guard.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{guard.full_name || guard.email || guard.id}</p>
                      <p className="text-sm text-slate-600">{guard.email}</p>
                    </div>
                    {isPending ? <StatusBadge tone="warning">Pending</StatusBadge> : <StatusBadge tone="good">Active</StatusBadge>}
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {pools.map((pool) => (
                      <label key={pool.id} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                        <input
                          type="checkbox"
                          checked={selected.has(pool.id)}
                          onChange={() => toggleAssignment(guard.id, pool.id)}
                        />
                        <span>{pool.name}</span>
                      </label>
                    ))}
                  </div>

                  <div className="mt-4">
                    <button
                      type="button"
                      disabled={savingGuardId === guard.id}
                      onClick={() => saveAssignments(guard.id)}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                    >
                      {savingGuardId === guard.id ? 'Saving...' : 'Save assignments'}
                    </button>
                    {!selected.size ? (
                      <p className="mt-2 text-xs text-slate-500">No pools selected means the guard can access all company pools.</p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

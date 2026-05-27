'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, Copy, Link2, Send, Shield, UserCog, Users, Waves } from 'lucide-react';
import { getStoredSession } from '@/lib/appAccounts';
import { useDevCompanyScope } from '@/lib/useDevCompanyScope';
import { isGuardRole } from '@/lib/guardPools';
import { EmptyState, PageHeader, SectionCard, StatusBadge, buttonClass } from '../../../components/OperationsUI';
import { formatTeamRoleLabel, normalizeStoredTeamRole, roleSelectOptions } from '@/lib/teamRoles';

type TeamMember = {
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

type PendingInvite = {
  id: string;
  email: string;
  expires_at: string;
  invite_link: string;
};

export default function ManagementTeamPage() {
  const { companyId, query } = useDevCompanyScope();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [pools, setPools] = useState<PoolOption[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string[]>>({});
  const [pendingMembers, setPendingMembers] = useState<TeamMember[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [savingGuardId, setSavingGuardId] = useState<string | null>(null);
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [sendingInvite, setSendingInvite] = useState(false);
  const [copyingLink, setCopyingLink] = useState(false);

  const loadTeam = async () => {
    setError('');
    const devSession = getStoredSession()?.role === 'dev';

    if (devSession && !companyId) {
      setMembers([]);
      setPools([]);
      setAssignments({});
      setPendingMembers([]);
      setPendingInvites([]);
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

    setMembers(result.members ?? result.guards ?? []);
    setPools(result.pools ?? []);
    setAssignments(result.assignments ?? {});
    setPendingMembers(result.pendingMembers ?? []);
    if (inviteResult?.ok) {
      setCompanyName(inviteResult.company_name || '');
      setPendingInvites(inviteResult.pending_invites ?? []);
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

  const updateMemberRole = async (userId: string, role: string) => {
    setUpdatingRoleId(userId);
    setMessage('');
    const response = await fetch(`/api/pool-assignments${query}`, {
      method: 'PATCH',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...scopeBody(), user_id: userId, role }),
    });
    const result = await response.json().catch(() => null);
    setUpdatingRoleId(null);
    if (!response.ok || !result?.ok) {
      setMessage(result?.message || 'Unable to update role.');
      return;
    }
    await loadTeam();
    setMessage(result.message);
  };

  const sendInviteEmail = async () => {
    setSendingInvite(true);
    setMessage('');
    const response = await fetch(`/api/team-invite${query}`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...scopeBody(), email: inviteEmail, delivery: 'email' }),
    });
    const result = await response.json().catch(() => null);
    setSendingInvite(false);
    if (!response.ok || !result?.ok) {
      setMessage(result?.message || 'Unable to send invite email.');
      return;
    }
    setInviteEmail('');
    setMessage(result.message);
    await loadTeam();
  };

  const copyInviteLinkForEmail = async () => {
    if (!inviteEmail.trim()) {
      setMessage('Enter an email address first.');
      return;
    }

    setCopyingLink(true);
    setMessage('');
    const response = await fetch(`/api/team-invite${query}`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...scopeBody(), email: inviteEmail, delivery: 'link' }),
    });
    const result = await response.json().catch(() => null);
    setCopyingLink(false);

    if (!response.ok || !result?.ok || !result.invite_link) {
      setMessage(result?.message || 'Unable to create invite link.');
      return;
    }

    try {
      await navigator.clipboard.writeText(result.invite_link);
      setMessage(`Invite link copied for ${inviteEmail.trim()}. Send it by text or chat.`);
    } catch {
      setMessage(`Copy this invite link: ${result.invite_link}`);
    }

    await loadTeam();
  };

  const copyPendingInvite = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setMessage('Invite link copied.');
    } catch {
      setMessage(`Copy this link: ${link}`);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-xl border border-slate-200 bg-white py-12 shadow-sm">
        <p className="text-sm text-slate-600">Loading team...</p>
      </div>
    );
  }

  const guardMembers = members.filter((member) => isGuardRole(member.role));

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Management"
        title="Team"
        description="Invite staff by email, manage roles, and assign pools."
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
          <Send className="h-4 w-4 text-slate-500" />
          <h2 className="text-base font-semibold text-slate-950">Invite a team member</h2>
        </div>
        <p className="text-sm leading-6 text-slate-600">
          Send a branded invite email from {companyName || 'your company'}. They&apos;ll open the link, enter their name and password, and join automatically.
        </p>

        <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto_auto]">
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-slate-700">Email address</span>
            <input
              type="email"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              placeholder="lifeguard@example.com"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
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
              {sendingInvite ? 'Sending...' : 'Send email invite'}
            </button>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              disabled={copyingLink || !inviteEmail.trim()}
              onClick={() => void copyInviteLinkForEmail()}
              className={buttonClass.secondary}
            >
              <Link2 className="mr-2 h-4 w-4" />
              {copyingLink ? 'Creating link...' : 'Copy invite link'}
            </button>
          </div>
        </div>
      </SectionCard>

      {pendingInvites.length > 0 ? (
        <SectionCard className="p-5">
          <h2 className="text-base font-semibold text-slate-950">Pending invites</h2>
          <p className="mt-1 text-sm text-slate-500">These people haven&apos;t joined yet. You can resend or copy their link.</p>
          <div className="mt-4 space-y-3">
            {pendingInvites.map((invite) => (
              <div key={invite.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-slate-900">{invite.email}</p>
                  <p className="text-xs text-slate-500">Expires {new Date(invite.expires_at).toLocaleDateString()}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void copyPendingInvite(invite.invite_link)}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Copy className="h-4 w-4" />
                  Copy link
                </button>
              </div>
            ))}
          </div>
        </SectionCard>
      ) : null}

      {pendingMembers.length > 0 ? (
        <SectionCard className="p-5">
          <h2 className="text-base font-semibold text-slate-950">Needs approval</h2>
          <p className="mt-1 text-sm text-slate-500">Legacy pending members who joined before email invites.</p>
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
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      ) : null}

      <SectionCard className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <UserCog className="h-4 w-4 text-slate-500" />
          <h2 className="text-base font-semibold text-slate-950">Team roster</h2>
        </div>

        {members.length === 0 ? (
          <EmptyState
            icon={<Users className="h-6 w-6" />}
            title="No team members yet"
            description="Send your first email invite above. New members appear here after they join."
          />
        ) : (
          <div className="space-y-3">
            {members.map((member) => {
              const currentRole = normalizeStoredTeamRole(member.role);
              const isPending = String(member.status).toLowerCase() === 'pending';

              return (
                <div key={member.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{member.full_name || member.email || member.id}</p>
                      <p className="text-sm text-slate-600">{member.email}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      {isPending ? <StatusBadge tone="warning">Pending</StatusBadge> : <StatusBadge tone="good">Active</StatusBadge>}
                      <label className="flex items-center gap-2 text-sm">
                        <Shield className="h-4 w-4 text-slate-400" />
                        <span className="font-semibold text-slate-600">Role</span>
                        <select
                          value={currentRole}
                          disabled={updatingRoleId === member.id}
                          onChange={(event) => void updateMemberRole(member.id, event.target.value)}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800"
                        >
                          {roleSelectOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    Current access: {formatTeamRoleLabel(member.role)}
                    {currentRole === 'supervisor' ? ' · Can invite and manage team' : ''}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      <SectionCard className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <Waves className="h-4 w-4 text-slate-500" />
          <h2 className="text-base font-semibold text-slate-950">Pool assignments</h2>
        </div>
        <p className="mb-4 text-sm text-slate-600">Choose which pools each lifeguard can log. Leave all unchecked to allow every pool.</p>

        {guardMembers.length === 0 ? (
          <EmptyState
            icon={<Waves className="h-6 w-6" />}
            title="No lifeguards to assign yet"
            description="Pool assignments appear after lifeguards join through an invite."
          />
        ) : (
          <div className="space-y-4">
            {guardMembers.map((guard) => {
              const selected = new Set(assignments[guard.id] ?? []);

              return (
                <div key={guard.id} className="rounded-xl border border-slate-200 p-4">
                  <p className="font-semibold text-slate-900">{guard.full_name || guard.email || guard.id}</p>
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

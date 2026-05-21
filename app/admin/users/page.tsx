"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Member = {
  id: string;
  organization_id: string;
  user_id?: string | null;
  email: string;
  role: string;
  status: string;
  invited_at?: string | null;
  joined_at?: string | null;
};

export default function AdminUsersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'guard' | 'manager'>('guard');
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const supabase = createClient();
      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userRes?.user) throw new Error(userErr?.message || 'Not authenticated');
      const userId = userRes.user.id;

      const { data: adminRow, error: adminErr } = await supabase
        .from('admin_organizations')
        .select('organization_id')
        .eq('admin_id', userId)
        .single();

      if (adminErr || !adminRow?.organization_id) throw new Error(adminErr?.message || 'No organization found');
      const orgId = adminRow.organization_id;

      const { data: membersData, error: membersErr } = await supabase
        .from('organization_members')
        .select('*')
        .eq('organization_id', orgId)
        .order('invited_at', { ascending: false });

      if (membersErr) throw new Error(membersErr.message);
      setMembers((membersData as Member[]) || []);
    } catch (err) {
      setError((err as Error).message || 'Unable to load members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const sendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!inviteEmail.trim()) return setError('Enter an email');
    setBusy(true);

    try {
      const supabase = createClient();
      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userRes?.user) throw new Error(userErr?.message || 'Not authenticated');
      const userId = userRes.user.id;

      const { data: adminRow } = await supabase
        .from('admin_organizations')
        .select('organization_id')
        .eq('admin_id', userId)
        .single();
      const orgId = adminRow.organization_id;

      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      // insert invite
      const { error: inviteErr } = await supabase.from('invites').insert([
        {
          id: crypto.randomUUID(),
          token,
          organization_id: orgId,
          email: inviteEmail.trim().toLowerCase(),
          role: inviteRole,
          invited_by: userId,
          created_at: new Date().toISOString(),
          expires_at: expiresAt,
          status: 'pending',
        },
      ]);
      if (inviteErr) throw new Error(inviteErr.message || 'Failed to create invite');

      // insert organization member (invited)
      const { error: memberErr } = await supabase.from('organization_members').insert([
        {
          id: crypto.randomUUID(),
          organization_id: orgId,
          user_id: null,
          email: inviteEmail.trim().toLowerCase(),
          role: inviteRole,
          status: 'invited',
          invited_by: userId,
          invited_at: new Date().toISOString(),
        },
      ]);
      if (memberErr) throw new Error(memberErr.message || 'Failed to create organization member');

      setSuccess(`Invite sent to ${inviteEmail.trim().toLowerCase()}`);
      setInviteEmail('');
      await load();
    } catch (err) {
      setError((err as Error).message || 'Failed to send invite');
    } finally {
      setBusy(false);
    }
  };

  const disableMember = async (id: string) => {
    setError('');
    setSuccess('');
    try {
      const supabase = createClient();
      const { error } = await supabase.from('organization_members').update({ status: 'disabled' }).eq('id', id);
      if (error) throw new Error(error.message || 'Failed to disable');
      setSuccess('Member disabled');
      await load();
    } catch (err) {
      setError((err as Error).message || 'Failed to disable member');
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-blue-600">ChemDeck</p>
              <p className="text-sm text-slate-600">Team members</p>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="p-6 lg:p-8">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Users</h2>
              <form onSubmit={sendInvite} className="flex items-center gap-2">
                <input
                  type="email"
                  placeholder="email@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none"
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'guard' | 'manager')}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none"
                >
                  <option value="guard">Guard</option>
                  <option value="manager">Manager</option>
                </select>
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
                >
                  {busy ? 'Sending…' : 'Invite User'}
                </button>
              </form>
            </div>

            {error ? (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="font-semibold text-red-800">Error</p>
                <p className="mt-1 text-sm text-red-700">{error}</p>
              </div>
            ) : null}

            {success ? (
              <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-4">
                <p className="font-semibold text-green-900">Success</p>
                <p className="mt-1 text-sm text-green-900">{success}</p>
              </div>
            ) : null}

            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="text-left text-sm text-slate-600">
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Role</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Joined</th>
                    <th className="px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-sm text-slate-500">
                        Loading…
                      </td>
                    </tr>
                  ) : members.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-sm text-slate-500">
                        No members
                      </td>
                    </tr>
                  ) : (
                    members.map((m) => (
                      <tr key={m.id} className="border-t border-slate-100">
                        <td className="px-3 py-3 text-sm text-slate-800">{m.email}</td>
                        <td className="px-3 py-3 text-sm text-slate-800">{m.role}</td>
                        <td className="px-3 py-3 text-sm text-slate-800">{m.status}</td>
                        <td className="px-3 py-3 text-sm text-slate-800">{m.joined_at ? new Date(m.joined_at).toLocaleString() : '-'}</td>
                        <td className="px-3 py-3 text-sm">
                          {m.status === 'active' ? (
                            <button
                              onClick={() => disableMember(m.id)}
                              className="rounded-lg bg-rose-600 px-3 py-1 text-sm font-semibold text-white"
                            >
                              Disable
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

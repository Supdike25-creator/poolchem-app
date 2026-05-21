"use client";

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Invite = {
  email?: string | null;
  role?: string | null;
  organization_id: string;
  status?: string | null;
  expires_at?: string | null;
};

export default function InviteAcceptPage() {
  const { token } = useParams() as { token?: string };
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [invite, setInvite] = useState<Invite | null>(null);
  const [orgName, setOrgName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!token) {
        setError('Invalid invite token');
        setLoading(false);
        return;
      }

      try {
        const supabase = createClient();
        const { data: invites } = await supabase.from('invites').select('*').eq('token', token).limit(1).maybeSingle();
        const inv = invites as Invite | null;
        if (!inv) {
          setError('Invite not found');
          setLoading(false);
          return;
        }

        // check expired or accepted
        const now = new Date();
        if (inv.status === 'accepted' || (inv.expires_at && new Date(inv.expires_at) < now)) {
          setError('This invite is no longer valid.');
          setLoading(false);
          return;
        }

        setInvite(inv);
        setEmail(inv.email || '');

        // load org name
        const { data: org } = await supabase.from('organizations').select('name').eq('id', inv.organization_id).single();
        setOrgName(org?.name || '');
      } catch (err) {
        setError((err as Error).message || 'Failed to load invite');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [token]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!invite) return;
    if (!email.trim() || !password) return setError('Enter email and password');
    setSubmitting(true);

    try {
      const supabase = createClient();

      const { data, error: signErr } = await supabase.auth.signUp({ email: email.trim(), password });
      if (signErr) throw new Error(signErr.message || 'Failed to create account');
      const user = data?.user;
      if (!user) throw new Error('User creation failed');

      // update profiles
      const { error: profErr } = await supabase.from('profiles').upsert([
        { id: user.id, email: user.email, role: invite.role, status: 'active', has_org: true },
      ]);
      if (profErr) throw new Error(profErr.message || 'Failed to update profile');

      // update organization_members row(s) for this org and email
      const { error: memberErr } = await supabase
        .from('organization_members')
        .update({ status: 'active', user_id: user.id, joined_at: new Date().toISOString() })
        .eq('organization_id', invite.organization_id)
        .eq('email', invite.email);
      if (memberErr) throw new Error(memberErr.message || 'Failed to update organization member');

      // update invites
      const { error: invErr } = await supabase.from('invites').update({ accepted_at: new Date().toISOString(), status: 'accepted' }).eq('token', token);
      if (invErr) throw new Error(invErr.message || 'Failed to update invite');

      // redirect
      if ((invite.role || '').toLowerCase() === 'guard') {
        router.push('/guard');
      } else {
        router.push('/management/dashboard');
      }
    } catch (err) {
      setError((err as Error).message || 'Failed to accept invite');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-200 bg-slate-50 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold uppercase tracking-wide text-blue-600">ChemDeck</p>
                <p className="text-sm text-slate-600">Invite</p>
              </div>
            </div>
          </div>

          <div className="p-6 lg:p-8">
            {loading ? (
              <p className="text-sm text-slate-600">Loading…</p>
            ) : error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="font-semibold text-red-800">Error</p>
                <p className="mt-1 text-sm text-red-700">{error}</p>
              </div>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-slate-900">You&apos;ve been invited</h1>
                <p className="mt-2 text-sm text-slate-600">You&apos;ve been invited to join {orgName} as a {invite.role}.</p>

                <form className="mt-6 space-y-4" onSubmit={handleCreate}>
                  <label className="block">
                    <span className="text-sm font-semibold text-slate-700">Email</span>
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-base text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                      autoComplete="email"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-semibold text-slate-700">Password</span>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-base text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                      autoComplete="new-password"
                    />
                  </label>

                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white"
                    >
                      {submitting ? 'Creating…' : 'Create Account'}
                    </button>
                    <a href="/login" className="text-sm text-slate-600">Already have an account? Sign in</a>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

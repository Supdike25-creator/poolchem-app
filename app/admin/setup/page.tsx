"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function AdminSetupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Enter an organization name.');
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      // get current user id
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData?.user) throw new Error(userErr?.message || 'Unable to get user');
      const userId = userData.user.id;

      // create organization
      const { data: orgData, error: orgErr } = await supabase
        .from('organizations')
        .insert([{ name: name.trim() }])
        .select('id')
        .single();
      if (orgErr || !orgData?.id) throw new Error(orgErr?.message || 'Failed to create organization');
      const orgId = orgData.id;

      // link admin to organization
      const { error: linkErr } = await supabase.from('admin_organizations').insert([
        { admin_id: userId, organization_id: orgId },
      ]);
      if (linkErr) throw new Error(linkErr.message || 'Failed to link admin to organization');

      // update profile has_org
      const { error: profileErr } = await supabase.from('profiles').update({ has_org: true }).eq('id', userId);
      if (profileErr) throw new Error(profileErr.message || 'Failed to update profile');

      router.push('/management/dashboard');
    } catch (err) {
      setError((err as Error).message || 'An error occurred');
    } finally {
      setLoading(false);
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
                <p className="text-sm text-slate-600">Admin setup</p>
              </div>
            </div>
          </div>

          <div className="p-6 lg:p-8">
            <h1 className="text-2xl font-bold text-slate-900">Create your organization</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">Enter the organization name to get started.</p>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Organization name</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-base text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  autoComplete="organization"
                  required
                />
              </label>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {loading ? 'Creating…' : 'Create Organization'}
              </button>
            </form>

            {error ? (
              <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="font-semibold text-red-800">Error</p>
                <p className="mt-1 text-sm text-red-700">{error}</p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}

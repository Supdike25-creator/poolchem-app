'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseClient } from '../../../lib/supabaseClient';

export default function JoinCompany() {
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  const handleJoinCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) {
      setMessage('Invite code is required');
      setStatus('error');
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        setMessage('You must be signed in to join a company');
        setStatus('error');
        return;
      }

      // Find the organization by invite code
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('invite_code', inviteCode.trim().toUpperCase())
        .single();

      if (orgError || !orgData) {
        console.error('Error finding organization:', orgError);
        setMessage(`Invalid invite code: ${orgError?.message || 'Organization not found'}`);
        setStatus('error');
        return;
      }

      // Update the user's profile with the organization_id and set role to lifeguard (default)
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: session.user.id,
          email: session.user.email,
          full_name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email,
          organization_id: orgData.id,
          role: 'lifeguard'
        }, { onConflict: 'id' });

      if (profileError) {
        console.error('Error updating profile:', profileError);
        setMessage(`Failed to join company: ${profileError.message}`);
        setStatus('error');
        return;
      }

      // Redirect to the appropriate dashboard based on role
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      const appRole = profileData?.role === 'manager' ? 'manager' : 'guard';
      router.replace(appRole === 'manager' ? '/management/dashboard' : '/guard');
    } catch (error) {
      console.error('Unexpected error:', error);
      setMessage('An unexpected error occurred. Please try again.');
      setStatus('error');
    } finally {
      setStatus('idle');
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-200 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-8 lg:p-10">
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <p className="text-sm font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400">Join Company</p>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Join your team</h1>
          <p className="mt-3 text-slate-600 dark:text-slate-300">Enter your invite code to join an existing company workspace.</p>
        </div>

        <form onSubmit={handleJoinCompany} className="mt-10 space-y-6">
          <div>
            <label htmlFor="inviteCode" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Invite Code
            </label>
            <input
              type="text"
              id="inviteCode"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-white transition-colors text-center text-lg font-mono tracking-wider"
              placeholder="ABC123"
              maxLength={6}
              required
            />
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 text-center">
              Enter the 6-character code provided by your company admin
            </p>
          </div>

          <button
            type="submit"
            disabled={status === 'loading'}
            className="w-full flex items-center justify-center rounded-2xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 px-6 py-4 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {status === 'loading' ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Joining Company…
              </>
            ) : (
              'Join Company'
            )}
          </button>

          <div className="text-center">
            <Link
              href="/onboarding/company"
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
            >
              Need to create a company? Set up new company →
            </Link>
          </div>

          {message && (
            <div className="bg-red-50 dark:bg-red-950 rounded-2xl border border-red-200 dark:border-red-800 p-5">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <p className="font-semibold text-red-800 dark:text-red-200">Error</p>
                  <p className="mt-1 text-sm text-red-700 dark:text-red-300">{message}</p>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>
    </main>
  );
}
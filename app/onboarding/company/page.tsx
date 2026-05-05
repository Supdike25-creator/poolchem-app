'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseClient } from '../../../lib/supabaseClient';

export default function CompanyOnboarding() {
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [companyName, setCompanyName] = useState('');

  const generateInviteCode = () => {
    // Generate a 6-character alphanumeric invite code
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      setMessage('Company name is required');
      setStatus('error');
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        setMessage('You must be signed in to create a company');
        setStatus('error');
        return;
      }

      const inviteCode = generateInviteCode();

      // Create the organization
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert([{
          name: companyName.trim(),
          invite_code: inviteCode,
          created_by: session.user.id,
        }])
        .select()
        .single();

      if (orgError) {
        console.error('Error creating organization:', orgError);
        setMessage(`Failed to create company: ${orgError.message}`);
        setStatus('error');
        return;
      }

      // First, ensure the user's profile exists, then update it with organization_id and set role to manager
      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert({
          id: session.user.id,
          email: session.user.email,
          full_name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email,
          organization_id: orgData.id,
          role: 'manager'
        }, { onConflict: 'id' });

      if (upsertError) {
        console.error('Error updating profile:', upsertError);
        setMessage(`Company created but failed to update your profile: ${upsertError.message}`);
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <p className="text-sm font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400">Create Company</p>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Set up your company</h1>
          <p className="mt-3 text-slate-600 dark:text-slate-300">Create a company workspace to manage your pool chemistry team.</p>
        </div>

        <form onSubmit={handleCreateCompany} className="mt-10 space-y-6">
          <div>
            <label htmlFor="companyName" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Company Name
            </label>
            <input
              type="text"
              id="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-white transition-colors"
              placeholder="Enter your company name"
              required
            />
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
                Creating Company…
              </>
            ) : (
              'Create Company'
            )}
          </button>

          <div className="text-center">
            <Link
              href="/onboarding/join"
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
            >
              Already have an invite code? Join existing company →
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
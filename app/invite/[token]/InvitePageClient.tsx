'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Building2, CheckCircle2, Loader2, Mail, ShieldCheck } from 'lucide-react';
import ChemDeckLogo from '@/components/ChemDeckLogo';
import { createClient } from '@/lib/supabase/client';

type InviteDetails = {
  email: string;
  company_name: string;
  expires_at: string;
};

export default function InvitePageClient({ token }: { token: string }) {
  const supabase = useMemo(() => createClient(), []);

  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [loadError, setLoadError] = useState('');
  const [loadingInvite, setLoadingInvite] = useState(true);

  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [mode, setMode] = useState<'signup' | 'signin' | 'accept'>('signup');

  useEffect(() => {
    const loadInvite = async () => {
      setLoadingInvite(true);
      setLoadError('');

      const response = await fetch(`/api/invites/${encodeURIComponent(token)}`, { cache: 'no-store' });
      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.ok) {
        setLoadError(result?.message || 'This invite link is invalid.');
        setLoadingInvite(false);
        return;
      }

      setInvite(result.invite);
      setLoadingInvite(false);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user?.email?.toLowerCase() === result.invite.email.toLowerCase()) {
        setMode('accept');
        setAccepting(true);
        const acceptResponse = await fetch('/api/accept-invite', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const acceptResult = await acceptResponse.json().catch(() => null);
        setAccepting(false);

        if (acceptResponse.ok && acceptResult?.ok) {
          setNotice(acceptResult.message || 'Welcome aboard!');
          window.setTimeout(() => {
            window.location.assign(acceptResult.redirectTo || '/guard');
          }, 800);
          return;
        }

        if (acceptResult?.message) {
          setError(acceptResult.message);
        }
      } else if (session?.user) {
        setError(`This invite is for ${result.invite.email}. Sign out and use that email to continue.`);
        setMode('signin');
      }
    };

    void loadInvite();
  }, [supabase, token]);

  const handleSignup = async (event: FormEvent) => {
    event.preventDefault();
    if (!invite) return;

    setError('');
    setNotice('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);

    try {
      const createResponse = await fetch('/api/create-account', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: invite.email,
          password,
          full_name: fullName.trim() || undefined,
        }),
      });
      const createResult = await createResponse.json().catch(() => null);

      if (!createResponse.ok) {
        if (createResponse.status === 409) {
          setMode('signin');
          setError('That email already has an account. Sign in below to join your team.');
        } else {
          setError(createResult?.message || 'Unable to create account.');
        }
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: invite.email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      const acceptResponse = await fetch('/api/accept-invite', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token, full_name: fullName.trim() || undefined }),
      });
      const acceptResult = await acceptResponse.json().catch(() => null);

      if (!acceptResponse.ok || !acceptResult?.ok) {
        setError(acceptResult?.message || 'Account created, but we could not join your company.');
        return;
      }

      setNotice(acceptResult.message || `Welcome to ${invite.company_name}!`);
      window.setTimeout(() => {
        window.location.assign(acceptResult.redirectTo || '/guard');
      }, 800);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignIn = async (event: FormEvent) => {
    event.preventDefault();
    if (!invite) return;

    setError('');
    setNotice('');
    setSubmitting(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: invite.email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      const acceptResponse = await fetch('/api/accept-invite', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token, full_name: fullName.trim() || undefined }),
      });
      const acceptResult = await acceptResponse.json().catch(() => null);

      if (!acceptResponse.ok || !acceptResult?.ok) {
        setError(acceptResult?.message || 'Signed in, but we could not join your company.');
        return;
      }

      setNotice(acceptResult.message || `Welcome to ${invite.company_name}!`);
      window.setTimeout(() => {
        window.location.assign(acceptResult.redirectTo || '/guard');
      }, 800);
    } catch {
      setError('Unable to sign in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-[#0A1A2F] px-5 py-10 text-[#D9E1E8] sm:px-6">
      <section className="w-full max-w-[480px]">
        <div className="mb-8 text-center">
          <div className="mb-6 flex justify-center">
            <ChemDeckLogo variant="mark" scheme="dark" className="h-12 w-12" />
          </div>

          {loadingInvite ? (
            <div className="flex items-center justify-center gap-2 text-sm text-[#D9E1E8]/80">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading your invite...
            </div>
          ) : loadError ? (
            <>
              <h1 className="text-3xl font-semibold tracking-tight text-white">Invite unavailable</h1>
              <p className="mt-3 text-sm leading-6 text-red-100">{loadError}</p>
              <Link href="/login" className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-[#3EC6FF]">
                <ArrowLeft className="h-4 w-4" />
                Back to sign in
              </Link>
            </>
          ) : invite ? (
            <>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#3EC6FF]/30 bg-[#3EC6FF]/10 text-[#3EC6FF]">
                <Building2 className="h-7 w-7" />
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-white">Join {invite.company_name}</h1>
              <p className="mt-3 text-sm leading-6 text-[#D9E1E8]/80">
                You&apos;ve been invited to join this team on ChemDeck. Create your account and you&apos;ll be added automatically.
              </p>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-[#D9E1E8]">
                <Mail className="h-3.5 w-3.5" />
                {invite.email}
              </div>
            </>
          ) : null}
        </div>

        {!loadingInvite && !loadError && invite ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-xl">
            {accepting ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm">
                <Loader2 className="h-5 w-5 animate-spin text-[#3EC6FF]" />
                Joining {invite.company_name}...
              </div>
            ) : (
              <>
                <div className="mb-5 flex items-start gap-3 rounded-xl border border-[#3EC6FF]/20 bg-[#3EC6FF]/10 p-4">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#3EC6FF]" />
                  <div className="text-left text-sm leading-6 text-[#D9E1E8]">
                    <p className="font-semibold text-white">What happens next</p>
                    <p className="mt-1">
                      Set up your account once. You&apos;ll land directly in {invite.company_name} — no codes, no extra steps.
                    </p>
                  </div>
                </div>

                {error ? (
                  <div className="mb-4 rounded-lg border border-red-300/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</div>
                ) : null}
                {notice ? (
                  <div className="mb-4 flex items-center gap-2 rounded-lg border border-green-300/30 bg-green-500/10 px-4 py-3 text-sm text-green-100">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    {notice}
                  </div>
                ) : null}

                {mode === 'signin' ? (
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <p className="text-sm text-[#D9E1E8]/80">Sign in with your existing ChemDeck account to join this team.</p>
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium">Password</span>
                      <input
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        className="h-12 w-full rounded-md border border-white/10 bg-white/[0.08] px-4 text-sm text-white outline-none focus:border-[#3EC6FF]/70 focus:ring-2 focus:ring-[#3EC6FF]/20"
                        required
                      />
                    </label>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex h-12 w-full items-center justify-center rounded-md border border-[#3EC6FF] bg-[rgba(62,198,255,0.15)] text-sm font-semibold text-[#3EC6FF] hover:bg-[rgba(62,198,255,0.25)] disabled:opacity-50"
                    >
                      {submitting ? 'Signing in...' : `Sign in & join ${invite.company_name}`}
                    </button>
                    <button type="button" onClick={() => setMode('signup')} className="w-full text-sm text-[#D9E1E8]/70 hover:text-[#3EC6FF]">
                      Need to create an account instead?
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleSignup} className="space-y-4">
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium">Your name</span>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(event) => setFullName(event.target.value)}
                        placeholder="First and last name"
                        className="h-12 w-full rounded-md border border-white/10 bg-white/[0.08] px-4 text-sm text-white outline-none placeholder:text-[#D9E1E8]/45 focus:border-[#3EC6FF]/70 focus:ring-2 focus:ring-[#3EC6FF]/20"
                        required
                      />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium">Email</span>
                      <input
                        type="email"
                        value={invite.email}
                        readOnly
                        className="h-12 w-full cursor-not-allowed rounded-md border border-white/10 bg-white/[0.04] px-4 text-sm text-[#D9E1E8]/70"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium">Password</span>
                      <input
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="At least 8 characters"
                        className="h-12 w-full rounded-md border border-white/10 bg-white/[0.08] px-4 text-sm text-white outline-none placeholder:text-[#D9E1E8]/45 focus:border-[#3EC6FF]/70 focus:ring-2 focus:ring-[#3EC6FF]/20"
                        required
                      />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium">Confirm password</span>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        className="h-12 w-full rounded-md border border-white/10 bg-white/[0.08] px-4 text-sm text-white outline-none focus:border-[#3EC6FF]/70 focus:ring-2 focus:ring-[#3EC6FF]/20"
                        required
                      />
                    </label>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex h-12 w-full items-center justify-center rounded-md border border-[#3EC6FF] bg-[rgba(62,198,255,0.15)] text-sm font-semibold text-[#3EC6FF] hover:bg-[rgba(62,198,255,0.25)] disabled:opacity-50"
                    >
                      {submitting ? 'Creating account...' : `Create account & join ${invite.company_name}`}
                    </button>
                    <button type="button" onClick={() => setMode('signin')} className="w-full text-sm text-[#D9E1E8]/70 hover:text-[#3EC6FF]">
                      Already have an account? Sign in
                    </button>
                  </form>
                )}
              </>
            )}
          </div>
        ) : null}
      </section>
    </main>
  );
}

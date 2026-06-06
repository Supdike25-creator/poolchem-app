'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Building2, CheckCircle2, Loader2, LogIn, UserPlus } from 'lucide-react';
import ChemDeckLogo from '@/components/ChemDeckLogo';
import { createClient } from '@/lib/supabase/client';

type InviteDetails = {
  email: string;
  company_name: string;
  expires_at: string;
};

export default function InvitePageClient({ token }: { token: string }) {
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);

  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [hasAccount, setHasAccount] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [loadingInvite, setLoadingInvite] = useState(true);

  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [mode, setMode] = useState<'signup' | 'signin'>('signup');

  const requestedMode = searchParams.get('mode');

  useEffect(() => {
    if (requestedMode === 'login') {
      setMode('signin');
    }
  }, [requestedMode]);

  const finishJoin = (acceptResult: { message?: string; redirectTo?: string }) => {
    setNotice(acceptResult.message || 'Welcome aboard!');
    window.setTimeout(() => {
      window.location.assign(acceptResult.redirectTo || '/guard');
    }, 700);
  };

  const acceptInvite = async (full_name?: string) => {
    const acceptResponse = await fetch('/api/accept-invite', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token, full_name }),
    });
    const acceptResult = await acceptResponse.json().catch(() => null);

    if (!acceptResponse.ok || !acceptResult?.ok) {
      throw new Error(acceptResult?.message || 'Unable to join this company.');
    }

    finishJoin(acceptResult);
  };

  useEffect(() => {
    let cancelled = false;

    const loadInvite = async () => {
      setLoadingInvite(true);
      setLoadError('');
      setError('');

      try {
        const response = await fetch(`/api/invites/${encodeURIComponent(token)}`, { cache: 'no-store' });
        const result = await response.json().catch(() => null);

        if (cancelled) return;

        if (!response.ok || !result?.ok) {
          setInvite(null);
          setLoadError(result?.message || 'This invite link is invalid.');
          setLoadingInvite(false);
          return;
        }

        setInvite(result.invite);
        setHasAccount(Boolean(result.has_account));
        if (result.has_account && requestedMode !== 'login') {
          setMode('signin');
        } else if (!result.has_account) {
          setMode('signup');
        }
        setLoadingInvite(false);

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (cancelled) return;

        if (session?.user?.email?.toLowerCase() === result.invite.email.toLowerCase()) {
          setAccepting(true);
          try {
            const acceptResponse = await fetch('/api/accept-invite', {
              method: 'POST',
              credentials: 'same-origin',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ token }),
            });
            const acceptResult = await acceptResponse.json().catch(() => null);

            if (!acceptResponse.ok || !acceptResult?.ok) {
              throw new Error(acceptResult?.message || 'Unable to join this company.');
            }

            if (!cancelled) {
              finishJoin(acceptResult);
            }
          } catch (acceptError) {
            if (!cancelled) {
              setError((acceptError as Error).message);
            }
          } finally {
            if (!cancelled) {
              setAccepting(false);
            }
          }
        } else if (session?.user) {
          setError(`This invite is for ${result.invite.email}. Sign out first, then open the link again.`);
        }
      } catch (loadError) {
        if (!cancelled) {
          setInvite(null);
          setLoadError((loadError as Error).message || 'Unable to load invite.');
          setLoadingInvite(false);
        }
      }
    };

    void loadInvite();

    return () => {
      cancelled = true;
    };
  }, [supabase, token, requestedMode]);

  const handleSignup = async (event: FormEvent) => {
    event.preventDefault();
    if (!invite) return;

    setError('');
    setNotice('');

    if (!fullName.trim()) {
      setError('Enter your name.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
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
          full_name: fullName.trim(),
          signup_as: 'invite',
        }),
      });
      const createResult = await createResponse.json().catch(() => null);

      if (!createResponse.ok) {
        if (createResponse.status === 409) {
          setHasAccount(true);
          setMode('signin');
          setError('You already have a ChemDeck account. Sign in below to join this company.');
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

      await acceptInvite(fullName.trim());
    } catch (submitError) {
      setError((submitError as Error).message || 'Something went wrong. Please try again.');
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

      await acceptInvite();
    } catch (submitError) {
      setError((submitError as Error).message || 'Unable to sign in.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setError('');
    window.location.reload();
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
              <p className="mt-4 text-sm leading-6 text-[#D9E1E8]/75">
                If you just set up email, your manager may need to send a fresh invite from Team after Vercel env vars are saved.
              </p>
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
              <h1 className="text-3xl font-semibold tracking-tight text-white">Hello,</h1>
              <p className="mt-3 text-base leading-7 text-[#D9E1E8]">
                You have been invited to join <span className="font-semibold text-white">{invite.company_name}</span> on ChemDeck.
              </p>
              <p className="mt-2 text-sm text-[#D9E1E8]/70">Invited as {invite.email}</p>
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
                <div className="mb-5 grid grid-cols-2 gap-2 rounded-xl bg-white/[0.04] p-1">
                  <button
                    type="button"
                    onClick={() => setMode('signup')}
                    className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                      mode === 'signup' ? 'bg-[#3EC6FF]/20 text-white' : 'text-[#D9E1E8]/70 hover:text-white'
                    }`}
                  >
                    <UserPlus className="h-4 w-4" />
                    Create account
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('signin')}
                    className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                      mode === 'signin' ? 'bg-[#3EC6FF]/20 text-white' : 'text-[#D9E1E8]/70 hover:text-white'
                    }`}
                  >
                    <LogIn className="h-4 w-4" />
                    Sign in
                  </button>
                </div>

                {hasAccount && mode === 'signup' ? (
                  <p className="mb-4 rounded-lg border border-amber-300/20 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">
                    This email already has a ChemDeck account. Use Sign in to join {invite.company_name}.
                  </p>
                ) : null}

                {error ? (
                  <div className="mb-4 rounded-lg border border-red-300/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                    {error}
                    {error.includes('Sign out') ? (
                      <button type="button" onClick={() => void handleSignOut()} className="mt-2 block font-semibold text-white underline">
                        Sign out
                      </button>
                    ) : null}
                  </div>
                ) : null}
                {notice ? (
                  <div className="mb-4 flex items-center gap-2 rounded-lg border border-green-300/30 bg-green-500/10 px-4 py-3 text-sm text-green-100">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    {notice}
                  </div>
                ) : null}

                {mode === 'signin' ? (
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <p className="text-sm leading-6 text-[#D9E1E8]/80">
                      Sign in to link your existing ChemDeck account to {invite.company_name}.
                    </p>
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium">Password</span>
                      <input
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Enter your password"
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
                  </form>
                ) : (
                  <form onSubmit={handleSignup} className="space-y-4">
                    <p className="text-sm leading-6 text-[#D9E1E8]/80">
                      Create your account for {invite.email}. You&apos;ll join {invite.company_name} right away.
                    </p>
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
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex h-12 w-full items-center justify-center rounded-md border border-[#3EC6FF] bg-[rgba(62,198,255,0.15)] text-sm font-semibold text-[#3EC6FF] hover:bg-[rgba(62,198,255,0.25)] disabled:opacity-50"
                    >
                      {submitting ? 'Creating account...' : `Create account & join ${invite.company_name}`}
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

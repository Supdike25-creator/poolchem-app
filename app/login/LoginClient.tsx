'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

const roleLabels: Record<string, string> = {
  manager: 'Manager / Supervisor',
  guard: 'Guard / Technician',
};

const getFriendlyError = (raw?: string | null) => {
  if (!raw) return '';

  const message = raw.toLowerCase();

  if (message.includes('invalid login credentials')) {
    return 'Incorrect email or password. Please try again.';
  }

  if (message.includes('google') || message.includes('oauth')) {
    return 'This account uses Google Sign In. Please use the Sign in with Google button instead.';
  }

  return raw;
};

const GoogleIcon = () => (
  <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

const AppleIcon = () => (
  <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M16.36 12.42c-.03-2.36 1.93-3.49 2.02-3.55-1.1-1.61-2.81-1.83-3.42-1.86-1.46-.15-2.84.86-3.58.86-.73 0-1.86-.84-3.06-.82-1.58.02-3.03.92-3.84 2.33-1.64 2.84-.42 7.05 1.18 9.35.78 1.13 1.71 2.4 2.94 2.35 1.18-.05 1.63-.76 3.05-.76 1.43 0 1.83.76 3.08.74 1.27-.02 2.07-1.15 2.85-2.29.9-1.31 1.27-2.58 1.29-2.65-.03-.01-2.48-.95-2.51-3.7z" />
    <path d="M14 5.47c.65-.79 1.09-1.89.97-2.98-.94.04-2.08.63-2.76 1.42-.6.7-1.13 1.82-.99 2.89 1.05.08 2.12-.53 2.78-1.33z" />
  </svg>
);

export default function LoginClient({
  role,
  authAction,
  authError,
}: {
  role?: string;
  authAction?: string;
  authError?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(() => getFriendlyError(authError));
  const [isLoading, setIsLoading] = useState(false);

  const roleLabel = role ? roleLabels[role] : null;

  const handleEmailSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError('');

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(getFriendlyError(signInError.message));
      setIsLoading(false);
      return;
    }

    router.refresh();
  };

  const handleOAuthSignIn = async (provider: 'google' | 'apple') => {
    setIsLoading(true);
    setError('');

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (signInError) {
      setError(getFriendlyError(signInError.message));
      setIsLoading(false);
    }
  };

  return (
    <main
      data-auth-action={authAction || undefined}
      className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-slate-100"
    >
      <section className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl shadow-black/40">
        <div className="border-b border-slate-800 bg-slate-900 px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-950/30">
              <svg aria-hidden="true" className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                />
              </svg>
            </div>
            <div>
              <p className="text-lg font-bold text-white">ChemDeck</p>
              {roleLabel ? <p className="text-sm text-slate-400">{roleLabel}</p> : null}
            </div>
          </div>
        </div>

        <div className="px-6 py-7">
          <h1 className="text-2xl font-bold text-white">Sign in</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">Access your pool chemistry workspace.</p>

          {error ? (
            <div className="mt-5 rounded-xl border border-red-400/30 bg-red-950/40 p-4 text-sm text-red-100">
              {error}
            </div>
          ) : null}

          <form className="mt-6 space-y-4" onSubmit={handleEmailSignIn}>
            <label className="block">
              <span className="text-sm font-semibold text-slate-200">Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-base text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15"
                autoComplete="email"
                required
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-200">Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-base text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15"
                autoComplete="current-password"
                required
              />
            </label>

            <button
              type="submit"
              disabled={isLoading}
              data-sound="click"
              className="w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <Link
            href="/forgot-password"
            className="mt-3 inline-flex text-sm font-medium text-slate-400 transition hover:text-white"
          >
            Forgot password?
          </Link>

          <div className="my-7 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-800" />
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Or continue with</span>
            <div className="h-px flex-1 bg-slate-800" />
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => handleOAuthSignIn('google')}
              disabled={isLoading}
              data-sound="click"
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-800 disabled:text-slate-400"
            >
              <GoogleIcon />
              {isLoading ? 'Connecting...' : 'Sign in with Google'}
            </button>

            <button
              type="button"
              onClick={() => handleOAuthSignIn('apple')}
              disabled={isLoading}
              data-sound="click"
              className="flex w-full items-center justify-center gap-3 rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white ring-1 ring-slate-700 transition hover:bg-slate-950 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-400"
            >
              <AppleIcon />
              {isLoading ? 'Connecting...' : 'Sign in with Apple'}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

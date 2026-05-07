'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import {
  AppRole,
  clearAppSession,
  confirmAccountEmailCode,
  createManualAccount,
  createOrUpdateGoogleAccount,
  findAccount,
  getAppBaseUrl,
  normalizeAppRole,
  recoverAccount,
  sendAccountEmailCode,
  setAppSession,
  type AppAccount,
} from '../../lib/appAccounts';
import { getSupabaseClient } from '../../lib/supabaseClient';

const roleLabels: Record<AppRole, string> = {
  manager: 'Manager / Supervisor',
  guard: 'Guard / Technician',
};

const redirectRoute = (role: AppRole) => (role === 'manager' ? '/management/dashboard' : '/guard');

export default function LoginClient({ role: roleParam }: { role?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'create' | 'recover'>('login');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [notice, setNotice] = useState('');
  const [createdAccount, setCreatedAccount] = useState<AppAccount | null>(null);
  const [recoveredAccount, setRecoveredAccount] = useState<AppAccount | null>(null);
  const [loginForm, setLoginForm] = useState({ username: '', passcode: '' });
  const [createForm, setCreateForm] = useState({ name: '', birthday: '', email: '', code: '' });
  const [recoverForm, setRecoverForm] = useState({ email: '', code: '' });
  const [createStep, setCreateStep] = useState<'details' | 'code'>('details');
  const [recoverStep, setRecoverStep] = useState<'email' | 'code'>('email');

  const role = normalizeAppRole(roleParam);
  const label = roleLabels[role];

  useEffect(() => {
    const supabase = getSupabaseClient();
    let ignore = false;

    const checkLogin = async () => {
      try {
        setStatus('loading');
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (ignore) return;

        if (error) {
          setStatus('error');
          setMessage(error.message);
          return;
        }

        if (!session?.user) {
          setStatus('idle');
          return;
        }

        const user = session.user;
        const { data: profileData } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        const savedRole = profileData?.role ? normalizeAppRole(profileData.role) : role;

        if (!profileData?.role) {
          const profilePayload = {
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email,
            role,
          };

          await supabase.from('profiles').upsert([profilePayload], { onConflict: 'id' });
        }

        await createOrUpdateGoogleAccount({
          id: user.id,
          name: user.user_metadata?.full_name || user.user_metadata?.name || user.email || 'Google User',
          email: user.email,
          role: savedRole,
        });
        router.replace(redirectRoute(savedRole));
      } catch (error) {
        if (ignore) return;
        setStatus('error');
        setMessage((error as Error).message);
      }
    };

    checkLogin();

    return () => {
      ignore = true;
    };
  }, [router, role]);

  const handleGoogleSignIn = async () => {
    setStatus('loading');
    setMessage('');
    setNotice('');
    clearAppSession();

    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${getAppBaseUrl()}/login?role=${role}`,
      },
    });

    if (error) {
      setStatus('error');
      setMessage(error.message);
    }
  };

  const handleAccountLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('loading');
    setMessage('');
    setNotice('');
    setCreatedAccount(null);

    try {
      const account = await findAccount(loginForm.username, loginForm.passcode);
      if (!account) {
        setStatus('error');
        setMessage('That username and passcode did not match an account.');
        return;
      }

      if (account.role !== role) {
        setStatus('error');
        setMessage(`This account belongs to the ${roleLabels[account.role]} workspace.`);
        return;
      }

      await getSupabaseClient().auth.signOut();
      setAppSession(account);
      router.replace(redirectRoute(account.role));
    } catch (error) {
      setStatus('error');
      setMessage((error as Error).message);
    }
  };

  const handleCreateAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('loading');
    setMessage('');
    setNotice('');

    if (!createForm.name.trim() || !createForm.birthday || !createForm.email.trim()) {
      setStatus('error');
      setMessage('Enter your name, birthday, and email to create an account.');
      return;
    }

    try {
      await getSupabaseClient().auth.signOut();
      await sendAccountEmailCode(createForm.email, true);
      setCreateStep('code');
      setStatus('idle');
      setNotice('Check your email for the ChemDeck confirmation code.');
    } catch (error) {
      setStatus('error');
      setMessage((error as Error).message);
    }
  };

  const handleConfirmCreateAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('loading');
    setMessage('');
    setNotice('');

    if (!createForm.code.trim()) {
      setStatus('error');
      setMessage('Enter the confirmation code from your email.');
      return;
    }

    try {
      await confirmAccountEmailCode(createForm.email, createForm.code);
      const account = await createManualAccount(createForm.name, createForm.birthday, role);
      setCreatedAccount(account);
      setStatus('idle');
      setNotice('Your ChemDeck account was saved in Supabase and linked to this email.');
    } catch (error) {
      setStatus('error');
      setMessage((error as Error).message);
    }
  };

  const handleSendRecoveryCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('loading');
    setMessage('');
    setNotice('');
    setRecoveredAccount(null);

    if (!recoverForm.email.trim()) {
      setStatus('error');
      setMessage('Enter the email for your ChemDeck account.');
      return;
    }

    try {
      await getSupabaseClient().auth.signOut();
      await sendAccountEmailCode(recoverForm.email, false);
      setRecoverStep('code');
      setStatus('idle');
      setNotice('Check your email for the recovery confirmation code.');
    } catch (error) {
      setStatus('error');
      setMessage((error as Error).message);
    }
  };

  const handleConfirmRecoveryCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('loading');
    setMessage('');
    setNotice('');

    if (!recoverForm.code.trim()) {
      setStatus('error');
      setMessage('Enter the confirmation code from your email.');
      return;
    }

    try {
      await confirmAccountEmailCode(recoverForm.email, recoverForm.code);
      const account = await recoverAccount();
      setRecoveredAccount(account);
      setStatus('idle');
      setNotice('Your email was confirmed and your account recovery was saved.');
    } catch (error) {
      setStatus('error');
      setMessage((error as Error).message);
    }
  };

  const continueWithCreatedAccount = () => {
    if (!createdAccount) return;
    router.replace(redirectRoute(createdAccount.role));
  };

  const continueWithRecoveredAccount = () => {
    if (!recoveredAccount) return;
    router.replace(redirectRoute(recoveredAccount.role));
  };

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <Link
          href="/"
          data-sound="back"
          className="mb-4 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Go back
        </Link>

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
                <p className="text-sm text-slate-600">{label}</p>
              </div>
            </div>
          </div>

          <div className="p-6 lg:p-8">
            <div className="mb-6 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
              {(['login', 'create', 'recover'] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    setMode(item);
                    setMessage('');
                    setNotice('');
                    setCreatedAccount(null);
                    setRecoveredAccount(null);
                  }}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                    mode === item ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600 hover:text-slate-950'
                  }`}
                >
                  {item === 'login' ? 'Log in' : item === 'create' ? 'Create' : 'Recover'}
                </button>
              ))}
            </div>

            <h1 className="text-2xl font-bold text-slate-900">
              {mode === 'login'
                ? 'Enter your username and passcode'
                : mode === 'create'
                  ? 'Create your account'
                  : 'Recover your account'}
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {mode === 'login'
                ? 'Use the username and passcode created for this workspace, or continue with Google.'
                : mode === 'create'
                  ? 'Enter your name, birthday, and email. ChemDeck will email a confirmation code before creating the account.'
                  : 'Enter your account email. ChemDeck will send a confirmation code and create a new passcode.'}
            </p>

            {mode === 'login' ? (
              <form className="mt-6 space-y-4" onSubmit={handleAccountLogin}>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Username</span>
                  <input
                    value={loginForm.username}
                    onChange={(event) => setLoginForm((current) => ({ ...current, username: event.target.value }))}
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-base text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    autoComplete="username"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Passcode</span>
                  <input
                    value={loginForm.passcode}
                    onChange={(event) => setLoginForm((current) => ({ ...current, passcode: event.target.value }))}
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-base text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    inputMode="numeric"
                    autoComplete="current-password"
                  />
                </label>
                <button
                  type="submit"
                  disabled={status === 'loading'}
                  data-sound="click"
                  className="w-full rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  Log in
                </button>
              </form>
            ) : mode === 'create' && createStep === 'details' ? (
              <form className="mt-6 space-y-4" onSubmit={handleCreateAccount}>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Name</span>
                  <input
                    value={createForm.name}
                    onChange={(event) => setCreateForm((current) => ({ ...current, name: event.target.value }))}
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-base text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    autoComplete="name"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Email</span>
                  <input
                    type="email"
                    value={createForm.email}
                    onChange={(event) => setCreateForm((current) => ({ ...current, email: event.target.value }))}
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-base text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    autoComplete="email"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Birthday</span>
                  <input
                    type="date"
                    value={createForm.birthday}
                    onChange={(event) => setCreateForm((current) => ({ ...current, birthday: event.target.value }))}
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-base text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    autoComplete="bday"
                  />
                </label>
                <button
                  type="submit"
                  disabled={status === 'loading'}
                  data-sound="click"
                  className="w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  Create account
                </button>
              </form>
            ) : mode === 'create' ? (
              <form className="mt-6 space-y-4" onSubmit={handleConfirmCreateAccount}>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Confirmation code</span>
                  <input
                    value={createForm.code}
                    onChange={(event) => setCreateForm((current) => ({ ...current, code: event.target.value }))}
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-base text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCreateStep('details')}
                    className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={status === 'loading'}
                    data-sound="click"
                    className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                  >
                    Confirm
                  </button>
                </div>
              </form>
            ) : recoverStep === 'email' ? (
              <form className="mt-6 space-y-4" onSubmit={handleSendRecoveryCode}>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Email</span>
                  <input
                    type="email"
                    value={recoverForm.email}
                    onChange={(event) => setRecoverForm((current) => ({ ...current, email: event.target.value }))}
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-base text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    autoComplete="email"
                  />
                </label>
                <button
                  type="submit"
                  disabled={status === 'loading'}
                  data-sound="click"
                  className="w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  Send recovery code
                </button>
              </form>
            ) : (
              <form className="mt-6 space-y-4" onSubmit={handleConfirmRecoveryCode}>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Confirmation code</span>
                  <input
                    value={recoverForm.code}
                    onChange={(event) => setRecoverForm((current) => ({ ...current, code: event.target.value }))}
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-base text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRecoverStep('email')}
                    className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={status === 'loading'}
                    data-sound="click"
                    className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                  >
                    Confirm
                  </button>
                </div>
              </form>
            )}

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">or</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={status === 'loading'}
              data-sound="click"
              className="w-full flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>

            {createdAccount ? (
              <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4">
                <p className="font-semibold text-green-900">Account created</p>
                <div className="mt-3 grid gap-2 text-sm text-green-900">
                  <p>
                    Username: <span className="font-bold">{createdAccount.username}</span>
                  </p>
                  <p>
                    Passcode: <span className="font-bold">{createdAccount.passcode}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={continueWithCreatedAccount}
                  className="mt-4 w-full rounded-xl bg-green-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-800"
                >
                  Continue
                </button>
              </div>
            ) : null}

            {recoveredAccount ? (
              <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4">
                <p className="font-semibold text-green-900">Account recovered</p>
                <div className="mt-3 grid gap-2 text-sm text-green-900">
                  <p>
                    Username: <span className="font-bold">{recoveredAccount.username}</span>
                  </p>
                  <p>
                    New passcode: <span className="font-bold">{recoveredAccount.passcode}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={continueWithRecoveredAccount}
                  className="mt-4 w-full rounded-xl bg-green-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-800"
                >
                  Continue
                </button>
              </div>
            ) : null}

            {message ? (
              <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="font-semibold text-red-800">Error</p>
                <p className="mt-1 text-sm text-red-700">{message}</p>
              </div>
            ) : null}

            {notice ? (
              <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
                <p className="font-semibold text-blue-900">Next step</p>
                <p className="mt-1 text-sm text-blue-800">{notice}</p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}

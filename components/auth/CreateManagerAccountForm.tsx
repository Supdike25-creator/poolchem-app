'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import ChemDeckLogo from '@/components/ChemDeckLogo';
import { createClient } from '@/lib/supabase/client';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function CreateManagerAccountForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setNotice('');

    const normalizedEmail = email.trim().toLowerCase();

    if (!emailPattern.test(normalizedEmail)) {
      setError('Enter a valid email address.');
      return;
    }

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
      const response = await fetch('/api/create-account', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          email: normalizedEmail,
          password,
          full_name: fullName.trim(),
          signup_as: 'manager',
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result?.message || 'Unable to create account.');
        return;
      }

      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      await fetch('/api/choose-role', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ role: 'manager' }),
      });

      setNotice('Manager account created. Setting up your company...');
      window.setTimeout(() => {
        router.replace(result?.redirectTo || '/create-company');
      }, 500);
    } catch {
      setError('Unable to create account. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="mb-6 text-center">
        <div className="mb-6 flex justify-center">
          <ChemDeckLogo variant="full" scheme="light" className="hidden w-[200px] sm:block" />
          <ChemDeckLogo variant="mark" scheme="light" className="h-10 w-10 sm:hidden" />
        </div>
        <h1 id="signup-modal-title" className="text-2xl font-semibold tracking-tight text-slate-950">
          Create manager account
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          For supervisors setting up a new ChemDeck company. Employees must use the invite link from their supervisor.
        </p>
      </div>

      {error ? (
        <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm leading-6 text-red-700">{error}</p>
        </div>
      ) : null}
      {notice ? (
        <div className="mb-5 rounded-md border border-blue-200 bg-blue-50 px-4 py-3">
          <p className="text-sm leading-6 text-blue-900">{notice}</p>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Your name</span>
          <input
            type="text"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="First and last name"
            className="h-12 w-full rounded-md border border-slate-200 bg-slate-50 px-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            disabled={submitting}
            autoComplete="name"
            required
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Work email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="h-12 w-full rounded-md border border-slate-200 bg-slate-50 px-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            disabled={submitting}
            autoComplete="email"
            required
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Create a password"
            className="h-12 w-full rounded-md border border-slate-200 bg-slate-50 px-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            disabled={submitting}
            autoComplete="new-password"
            required
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Confirm password</span>
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Confirm your password"
            className="h-12 w-full rounded-md border border-slate-200 bg-slate-50 px-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            disabled={submitting}
            autoComplete="new-password"
            required
          />
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="flex h-12 w-full items-center justify-center rounded-md bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
        >
          {submitting ? 'Creating...' : 'Create manager account'}
        </button>
      </form>

      <p className="mt-6 text-center text-xs leading-5 text-slate-500">
        Employee? Ask your supervisor for a ChemDeck invite email — you cannot sign up here.
      </p>
    </>
  );
}

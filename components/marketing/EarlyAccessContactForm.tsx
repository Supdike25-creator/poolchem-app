'use client';

import { FormEvent, useState } from 'react';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const inputClassName =
  'h-12 w-full rounded-md border border-slate-200 bg-slate-50 px-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100';

export default function EarlyAccessContactForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setNotice('');

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedCompany = company.trim();
    const trimmedMessage = message.trim();

    if (!trimmedName) {
      setError('Enter your name.');
      return;
    }

    if (!emailPattern.test(trimmedEmail)) {
      setError('Enter a valid email address.');
      return;
    }

    if (!trimmedCompany) {
      setError('Enter your company or facility name.');
      return;
    }

    if (trimmedMessage.length < 10) {
      setError('Tell us a little about your operation (at least 10 characters).');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          company: trimmedCompany,
          message: trimmedMessage,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result?.message || 'Unable to send your request. Please try again.');
        return;
      }

      setNotice(result?.message || 'Thanks — we received your request and will be in touch soon.');
      setName('');
      setEmail('');
      setCompany('');
      setMessage('');
    } catch {
      setError('Unable to send your request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_2px_16px_rgba(15,23,42,0.06)] sm:p-8">
      {error ? (
        <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm leading-6 text-red-700">{error}</p>
        </div>
      ) : null}
      {notice ? (
        <div className="mb-5 rounded-md border border-green-200 bg-green-50 px-4 py-3">
          <p className="text-sm leading-6 text-green-800">{notice}</p>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-5">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Your name</span>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="First and last name"
            className={inputClassName}
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
            className={inputClassName}
            disabled={submitting}
            autoComplete="email"
            required
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Company or facility</span>
          <input
            type="text"
            value={company}
            onChange={(event) => setCompany(event.target.value)}
            placeholder="Sunset HOA, City Rec Center, etc."
            className={inputClassName}
            disabled={submitting}
            autoComplete="organization"
            required
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Tell us about your operation</span>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="How many pools do you manage? What are you hoping ChemDeck can help with?"
            className="min-h-[140px] w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            disabled={submitting}
            required
          />
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="flex h-12 w-full items-center justify-center rounded-md bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
        >
          {submitting ? 'Sending...' : 'Request early access'}
        </button>
      </form>
    </div>
  );
}

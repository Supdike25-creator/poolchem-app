'use client';

import { useState } from 'react';
import type { AdminCompany } from '@/lib/devAdmin';
import { SectionCard, buttonClass } from '@/components/OperationsUI';

type CreateResult = {
  ok?: boolean;
  message?: string;
  details?: {
    name?: string;
    username?: string;
    passcode?: string;
    email?: string;
    role?: string;
  };
};

export default function CreateProfileForm({ companies }: { companies: AdminCompany[] }) {
  const [name, setName] = useState('');
  const [passcode, setPasscode] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('worker');
  const [companyId, setCompanyId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<CreateResult | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setResult(null);

    try {
      const response = await fetch('/api/dev/admin', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          scope: 'profile',
          action: 'create-user',
          name,
          passcode,
          username: username.trim() || undefined,
          email: email.trim() || undefined,
          role,
          company_id: companyId || undefined,
        }),
      });

      const data = (await response.json().catch(() => null)) as CreateResult | null;
      if (!response.ok || !data?.ok) {
        setResult({ ok: false, message: data?.message || 'Unable to create user.' });
        return;
      }

      setResult(data);
      setName('');
      setPasscode('');
      setUsername('');
      setEmail('');
      setRole('worker');
      setCompanyId('');
      window.setTimeout(() => window.location.reload(), 1200);
    } catch (error) {
      setResult({ ok: false, message: (error as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SectionCard className="mb-5 p-5">
      <h2 className="text-base font-semibold text-slate-950">Add User</h2>
      <p className="mt-1 text-sm text-slate-600">
        Create a login with a display name and passcode. Share the username and passcode with the user for sign-in.
      </p>

      <form onSubmit={(event) => void handleSubmit(event)} className="mt-4 grid gap-4 lg:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-slate-700">Name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            placeholder="Jordan Smith"
            className="h-10 w-full rounded-lg border border-slate-300 px-3"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-slate-700">Passcode</span>
          <input
            value={passcode}
            onChange={(event) => setPasscode(event.target.value)}
            required
            minLength={4}
            placeholder="1234"
            className="h-10 w-full rounded-lg border border-slate-300 px-3"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-slate-700">Username (optional)</span>
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Auto-generated if blank"
            className="h-10 w-full rounded-lg border border-slate-300 px-3"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-slate-700">Email (optional)</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="guard@example.com"
            className="h-10 w-full rounded-lg border border-slate-300 px-3"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-slate-700">Role</span>
          <select value={role} onChange={(event) => setRole(event.target.value)} className="h-10 w-full rounded-lg border border-slate-300 px-3">
            <option value="worker">worker / guard</option>
            <option value="boss">boss / manager</option>
            <option value="dev">dev</option>
          </select>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-slate-700">Company</span>
          <select value={companyId} onChange={(event) => setCompanyId(event.target.value)} className="h-10 w-full rounded-lg border border-slate-300 px-3">
            <option value="">No company</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>{company.company_name}</option>
            ))}
          </select>
        </label>

        <div className="lg:col-span-2 flex flex-wrap items-center gap-3">
          <button type="submit" disabled={submitting} className={buttonClass.primary}>
            {submitting ? 'Creating…' : 'Create user'}
          </button>
        </div>
      </form>

      {result?.message ? (
        <div
          className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
            result.ok ? 'border-green-200 bg-green-50 text-green-900' : 'border-red-200 bg-red-50 text-red-900'
          }`}
        >
          <p className="font-semibold">{result.message}</p>
          {result.details?.username ? (
            <p className="mt-2">
              Username: <span className="font-mono font-semibold">{result.details.username}</span>
              {' · '}
              Passcode: <span className="font-mono font-semibold">{result.details.passcode}</span>
            </p>
          ) : null}
        </div>
      ) : null}
    </SectionCard>
  );
}

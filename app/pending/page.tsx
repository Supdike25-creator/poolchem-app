'use client';

import Link from 'next/link';
import ChemDeckLogo from '@/components/ChemDeckLogo';

export default function PendingPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
      <div className="w-full max-w-lg rounded-2xl border border-amber-200 bg-white p-8 text-center shadow-sm">
        <ChemDeckLogo variant="mark" className="mx-auto mb-6 h-14 w-14" />
        <h1 className="text-3xl font-semibold text-slate-950">Waiting for approval</h1>
        <p className="mt-4 text-base leading-7 text-slate-600">
          Your account joined the company successfully, but a manager still needs to approve your access
          before you can log pools.
        </p>
        <p className="mt-3 text-sm text-slate-500">
          Ask your supervisor to open <span className="font-semibold">Management → Team</span> and approve your account.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Back to login
          </Link>
          <Link
            href="/pending"
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Check again
          </Link>
        </div>
      </div>
    </main>
  );
}

'use client';

import Link from 'next/link';
import { WifiOff } from 'lucide-react';

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
      <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-700">
          <WifiOff className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-semibold text-slate-950">You&apos;re offline</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          ChemDeck needs a connection to submit chemistry logs and sync alerts. Reconnect and try again.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-6 inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Retry
        </button>
        <p className="mt-4 text-sm text-slate-500">
          <Link href="/" className="font-semibold text-blue-700 hover:underline">
            Back to home
          </Link>
        </p>
      </div>
    </main>
  );
}

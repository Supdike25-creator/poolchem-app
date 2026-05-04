import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 shadow-lg">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">ChemDeck</p>
          <h1 className="mt-4 text-4xl font-semibold text-slate-900">Choose your workspace</h1>
          <p className="mt-3 text-slate-600">Pick the role that matches your responsibilities.</p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <Link
            href="/management/dashboard"
            className="rounded-3xl border border-blue-200 bg-blue-50 px-6 py-8 text-center transition hover:border-blue-300"
          >
            <p className="text-xl font-semibold text-blue-700">Manager / Supervisor</p>
            <p className="mt-2 text-slate-600">Access pool configuration, team logs, and management views.</p>
          </Link>
          <Link
            href="/guard"
            className="rounded-3xl border border-slate-200 bg-white px-6 py-8 text-center transition hover:border-slate-300"
          >
            <p className="text-xl font-semibold text-slate-900">Guard / Technician</p>
            <p className="mt-2 text-slate-600">Submit guard chemical logs and follow pool-specific dosing guidance.</p>
          </Link>
        </div>
      </div>
    </main>
  );
}

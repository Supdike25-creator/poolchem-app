import Link from 'next/link';

export default function ManagementRootPage() {
  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 shadow-lg">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Management Area</p>
        <h1 className="mt-4 text-3xl font-semibold text-slate-900">Management Workspace</h1>
        <p className="mt-3 text-slate-600">Use management routes to review pools, logs, and settings for your team.</p>

        <div className="mt-8 grid gap-4">
          <Link href="/management/dashboard" className="rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 text-center text-base font-medium text-blue-700 hover:bg-blue-100">
            Open Dashboard
          </Link>
          <Link href="/management/pools" className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-center text-base font-medium text-slate-700 hover:bg-slate-50">
            Configure Pools
          </Link>
          <Link href="/management/logs" className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-center text-base font-medium text-slate-700 hover:bg-slate-50">
            Review Logs
          </Link>
        </div>
      </div>
    </main>
  );
}

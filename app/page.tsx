import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl items-center">
      <div className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-blue-600 rounded-xl flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <div>
              <p className="text-base font-bold uppercase tracking-wide text-blue-600">ChemDeck</p>
              <p className="text-sm text-slate-600">Pool chemistry operations</p>
            </div>
          </div>
        </div>

        <div className="grid gap-8 p-6 lg:grid-cols-[1fr_1.2fr] lg:p-8">
          <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50 p-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Sign in</p>
              <h1 className="mt-3 text-3xl font-bold text-slate-900">Choose your workspace</h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">Pick the workflow that matches your shift. Managers review status and configuration; guards submit and review chemical logs.</p>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="font-semibold text-slate-900">Fast status</p>
                <p className="mt-1 text-slate-500">At-a-glance exceptions</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="font-semibold text-slate-900">Role based</p>
                <p className="mt-1 text-slate-500">Cleaner daily flow</p>
              </div>
            </div>
          </div>

        <div className="grid gap-4">
          <Link
            href="/login?role=manager"
            data-sound="click"
            className="group rounded-xl border border-blue-200 bg-blue-50 p-6 transition-all hover:border-blue-300 hover:bg-blue-100 hover:shadow-md"
          >
            <div className="mb-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
              <div>
                <p className="text-xl font-bold text-blue-900">Manager / Supervisor</p>
                <p className="mt-1 text-sm text-slate-600">Configuration, team logs, and exception review.</p>
              </div>
            </div>
            <div className="flex items-center text-blue-700">
              <span className="text-sm font-semibold mr-2">Continue</span>
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
          <Link
            href="/login?role=guard"
            data-sound="click"
            className="group rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-slate-300 hover:bg-slate-50 hover:shadow-md"
          >
            <div className="mb-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-700 rounded-xl flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
              <div>
                <p className="text-xl font-bold text-slate-900">Guard / Technician</p>
                <p className="mt-1 text-sm text-slate-600">Submit readings and follow pool-specific guidance.</p>
              </div>
            </div>
            <div className="flex items-center text-slate-700">
              <span className="text-sm font-semibold mr-2">Continue</span>
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
          </div>
        </div>
      </div>
      </div>
    </main>
  );
}

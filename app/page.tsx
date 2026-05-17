import Link from 'next/link';
import { ClipboardList, FlaskConical, ShieldCheck } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl items-center">
      <div className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
        <div className="border-b border-slate-200 bg-white px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-950">
              <FlaskConical className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-base font-semibold tracking-tight text-slate-950">ChemDeck</p>
              <p className="text-sm text-slate-500">Pool chemistry operations</p>
            </div>
          </div>
        </div>

        <div className="grid gap-8 p-6 lg:grid-cols-[1fr_1.2fr] lg:p-8">
          <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50 p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Sign in</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Choose your workspace</h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">Pick the workflow that matches your shift. Managers review status and configuration; guards submit and review chemical logs.</p>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="font-semibold text-slate-950">Fast status</p>
                <p className="mt-1 text-slate-500">At-a-glance exceptions</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="font-semibold text-slate-950">Role based</p>
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
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600">
              <ShieldCheck className="h-6 w-6 text-white" />
            </div>
              <div>
                <p className="text-xl font-semibold text-blue-950">Manager / Supervisor</p>
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
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900">
              <ClipboardList className="h-6 w-6 text-white" />
            </div>
              <div>
                <p className="text-xl font-semibold text-slate-950">Guard / Technician</p>
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

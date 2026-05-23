import Link from "next/link";

export default function CompanyOnboardingPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-8 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
          Workspace setup
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
          Company setup is needed
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Your account is signed in, but it is not connected to a company workspace yet. Ask a manager
          for a company code or finish workspace setup before using ChemDeck.
        </p>
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          If you expected to see your dashboard, your profile may be missing an organization or role.
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/pending"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
          >
            View account status
          </Link>
          <Link
            href="/login"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Back to login
          </Link>
        </div>
      </section>
    </main>
  );
}

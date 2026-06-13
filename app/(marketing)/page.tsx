import Link from 'next/link';
import InstallAppBanner from '@/components/InstallAppBanner';
import PwaLaunchRedirect from '@/components/PwaLaunchRedirect';

export default function HomePage() {
  return (
    <>
      <PwaLaunchRedirect />
      <div className="mx-auto max-w-6xl px-6 pt-4">
        <InstallAppBanner />
      </div>

      <section
        className="bg-white pb-20 pt-16"
        style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(37,99,235,0.08) 0%, transparent 70%)' }}
      >
        <div className="mx-auto max-w-4xl px-6 text-center">
          <div className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            Pool Chemistry Management Platform
          </div>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold leading-tight tracking-tight text-slate-950 sm:text-5xl">
            Keep Every Pool <span className="text-blue-600">Safe.</span>
            <br />
            Every Test <span className="text-blue-600">On Time.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-500">
            ChemDeck gives pool operators a smarter way to manage chemical logs, track compliance, and keep every
            employee accountable — from any device, in real time.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="/signup"
              className="rounded-xl bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              Get Started Free
            </Link>
            <Link
              href="/features"
              className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-base font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              See Features
            </Link>
          </div>
          <p className="mt-6 text-sm text-slate-400">No credit card required · Setup in under 5 minutes</p>
        </div>

        <div className="mx-auto mt-16 max-w-5xl px-6">
          <div className="flex aspect-video items-center justify-center rounded-2xl border border-t-4 border-slate-200 border-t-blue-600 bg-slate-100 shadow-[0_32px_80px_rgba(15,23,42,0.12)]">
            <p className="text-sm text-slate-400">App screenshot coming soon</p>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-slate-50 py-12">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-slate-400">
            Built for aquatic facilities
          </p>
          <p className="mx-auto max-w-2xl text-sm leading-6 text-slate-500">
            HOAs, recreation centers, apartment complexes, and pool service companies use ChemDeck to replace paper logs
            and catch chemistry issues before they become health violations.
          </p>
        </div>
      </section>

      <section className="bg-slate-950 py-20 text-white">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">Ready to modernize your pool operations?</h2>
          <p className="mt-4 text-lg text-slate-400">
            Start with a free trial or compare plans built for single facilities and multi-site teams.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/signup" className="rounded-xl bg-blue-600 px-8 py-3 font-semibold text-white transition hover:bg-blue-500">
              Start Free Trial
            </Link>
            <Link
              href="/pricing"
              className="rounded-xl border border-slate-700 px-8 py-3 font-semibold text-slate-300 transition hover:bg-slate-800"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

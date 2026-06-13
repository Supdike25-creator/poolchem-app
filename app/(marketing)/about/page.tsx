import Link from 'next/link';
import { onboardingSteps } from '@/components/marketing/marketingContent';

export default function AboutPage() {
  return (
    <section className="bg-slate-50 py-20">
      <div className="mx-auto max-w-4xl px-6">
        <div className="text-center">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-blue-600">About ChemDeck</p>
          <h1 className="text-3xl font-bold text-slate-950 sm:text-4xl">Up and running in minutes</h1>
          <p className="mt-4 text-slate-500">No IT team required. No complicated setup.</p>
        </div>

        <div className="mt-14 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm leading-7 text-slate-600">
            ChemDeck helps pool operators digitize daily chemistry logs, alert managers when readings are out of range,
            and produce compliance-ready reports. Managers run the workspace; employees log from the pool deck on any phone.
          </p>
        </div>

        <div className="mt-16 flex flex-col gap-8 md:flex-row md:items-start">
          {onboardingSteps.map((step, index) => (
            <div key={step.title} className="flex-1 px-2 text-center md:px-6">
              <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">
                {index + 1}
              </div>
              <h2 className="mb-2 text-base font-semibold text-slate-950">{step.title}</h2>
              <p className="text-sm leading-relaxed text-slate-500">{step.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 text-center">
          <Link
            href="/signup"
            className="inline-flex rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Create your workspace
          </Link>
        </div>
      </div>
    </section>
  );
}

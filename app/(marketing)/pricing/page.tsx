import Link from 'next/link';
import PricingPlans from '@/components/marketing/PricingPlans';

export default function PricingPage() {
  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Pricing</p>
          <h1 className="text-3xl font-bold text-slate-950 sm:text-4xl">Plans that scale with your operation</h1>
          <p className="mx-auto mt-4 max-w-2xl text-slate-500">
            Founding customer rates while we onboard our first operators. No per-employee fees — price is based on how
            many facilities and pools you manage.
          </p>
          <div className="mx-auto mt-6 inline-flex rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-800">
            Lock in founding pricing —{' '}
            <Link href="/signup" className="ml-1 font-semibold underline">
              start a free trial
            </Link>{' '}
            or{' '}
            <a href="mailto:ChemdeckCo@gmail.com?subject=ChemDeck%20pricing%20question" className="font-semibold underline">
              ask us a question
            </a>
          </div>
        </div>

        <div className="mt-14">
          <PricingPlans />
        </div>

        <p className="mx-auto mt-10 max-w-2xl text-center text-sm leading-6 text-slate-500">
          All plans include unlimited employees. Need more than 10 pools on a single property, municipal RFP support, or a
          custom rollout?{' '}
          <a href="mailto:ChemdeckCo@gmail.com?subject=ChemDeck%20custom%20pricing" className="font-semibold text-blue-700 underline">
            Contact us for custom pricing
          </a>
          .
        </p>
      </div>
    </section>
  );
}

import Link from 'next/link';
import { Check } from 'lucide-react';
import { pricingPlans } from '@/components/marketing/marketingContent';

const ctaClass = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700',
  secondary: 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50',
  dark: 'border border-slate-700 bg-slate-900 text-white hover:bg-slate-800',
} as const;

export default function PricingPlans() {
  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-2 lg:gap-8">
      {pricingPlans.map((plan) => (
        <article
          key={plan.id}
          className={`relative rounded-2xl border bg-white p-8 text-left shadow-sm ${
            plan.badge ? 'border-blue-300 ring-1 ring-blue-100' : 'border-slate-200'
          }`}
        >
          {plan.badge ? (
            <span className="absolute top-5 right-5 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
              {plan.badge}
            </span>
          ) : null}

          <h3 className="pr-28 text-xl font-semibold text-slate-950">{plan.title}</h3>

          <div className="mt-5 flex items-end gap-1">
            <span className="text-5xl font-bold tracking-tight text-slate-950">{plan.price}</span>
            <span className="pb-1 text-sm text-slate-500">{plan.priceSuffix}</span>
          </div>

          <p className="mt-4 text-sm leading-6 text-slate-600">{plan.description}</p>

          <div className="mt-6 space-y-2">
            {plan.highlights.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4 text-slate-500" />
                    <span className="text-sm font-medium text-slate-800">{item.label}</span>
                  </div>
                  <Check className="h-4 w-4 text-emerald-600" strokeWidth={3} />
                </div>
              );
            })}
          </div>

          <ul className="mt-6 space-y-2.5">
            {plan.bullets.map((bullet) => (
              <li key={bullet} className="flex items-start gap-2.5 text-sm text-slate-600">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" strokeWidth={3} />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>

          <Link
            href={plan.cta.href}
            className={`mt-8 inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition ${ctaClass[plan.cta.variant]}`}
          >
            {plan.cta.label}
          </Link>
        </article>
      ))}
    </div>
  );
}

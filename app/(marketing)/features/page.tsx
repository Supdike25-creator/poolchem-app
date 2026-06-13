import { marketingFeatures } from '@/components/marketing/marketingContent';

export default function FeaturesPage() {
  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Features</p>
          <h1 className="text-3xl font-bold text-slate-950 sm:text-4xl">Everything your team needs in one platform</h1>
          <p className="mx-auto mt-4 max-w-xl text-slate-500">
            Track tests, manage teams, and surface compliance issues before they become operational headaches.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {marketingFeatures.map((feature) => {
            const Icon = feature.icon;
            return (
              <article
                key={feature.title}
                className="rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-slate-300 hover:shadow-md"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <h2 className="mb-2 text-base font-semibold text-slate-950">{feature.title}</h2>
                <p className="text-sm leading-relaxed text-slate-500">{feature.description}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

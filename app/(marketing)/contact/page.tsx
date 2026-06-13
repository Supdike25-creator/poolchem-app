import EarlyAccessContactForm from '@/components/marketing/EarlyAccessContactForm';

export default function ContactPage() {
  return (
    <section className="bg-slate-50 py-20">
      <div className="mx-auto max-w-4xl px-6">
        <div className="text-center">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Contact</p>
          <h1 className="text-3xl font-bold text-slate-950 sm:text-4xl">Request early access</h1>
          <p className="mx-auto mt-4 max-w-2xl text-slate-500">
            Tell us about your pools and team. We&apos;ll reach out to help you get started with ChemDeck.
          </p>
        </div>

        <div className="mx-auto mt-12 max-w-xl">
          <EarlyAccessContactForm />
          <p className="mt-6 text-center text-sm text-slate-500">
            Prefer email? Reach us at{' '}
            <a href="mailto:ChemdeckCo@gmail.com" className="font-medium text-blue-600 hover:text-blue-700">
              ChemdeckCo@gmail.com
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}

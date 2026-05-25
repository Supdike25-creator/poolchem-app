import Link from 'next/link';
import ChemDeckLogo from '@/components/ChemDeckLogo';

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12 text-slate-900">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-800">
          ← Back to ChemDeck
        </Link>
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <ChemDeckLogo variant="full" className="mb-6 w-40" />
          <h1 className="text-3xl font-semibold">Terms of Service</h1>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            By using ChemDeck, your organization agrees to use the platform for lawful pool operations,
            maintain accurate chemistry records, and grant access only to authorized staff.
          </p>
          <h2 className="mt-8 text-lg font-semibold">Account responsibilities</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-600">
            <li>Managers are responsible for inviting staff and maintaining company access controls.</li>
            <li>Guards must submit readings for assigned pools accurately and promptly.</li>
            <li>Credentials and company codes must not be shared outside your organization.</li>
          </ul>
          <h2 className="mt-8 text-lg font-semibold">Service availability</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            ChemDeck is provided as an operational tool. Critical safety decisions remain the responsibility
            of on-site staff and facility management.
          </p>
          <h2 className="mt-8 text-lg font-semibold">Contact</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Terms questions can be sent to{' '}
            <a href="mailto:hello@chemdeck.com" className="font-medium text-blue-700 hover:text-blue-800">
              hello@chemdeck.com
            </a>.
          </p>
        </div>
      </div>
    </main>
  );
}

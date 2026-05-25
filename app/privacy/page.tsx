import Link from 'next/link';
import ChemDeckLogo from '@/components/ChemDeckLogo';

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12 text-slate-900">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-800">
          ← Back to ChemDeck
        </Link>
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <ChemDeckLogo variant="full" className="mb-6 w-40" />
          <h1 className="text-3xl font-semibold">Privacy Policy</h1>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            ChemDeck helps pool operators record chemistry readings, manage teams, and review compliance history.
            We collect account information, company membership, pool configuration, and chemistry log submissions
            needed to operate the service.
          </p>
          <h2 className="mt-8 text-lg font-semibold">What we store</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-600">
            <li>Account email, name, role, and company association</li>
            <li>Pool configuration and chemistry log readings submitted by your team</li>
            <li>Optional log photos uploaded for verification and audit review</li>
            <li>Workspace settings configured by company managers</li>
          </ul>
          <h2 className="mt-8 text-lg font-semibold">How data is used</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Data is used to provide guard logging, manager dashboards, announcements, and operational reporting
            for your organization. We do not sell customer data.
          </p>
          <h2 className="mt-8 text-lg font-semibold">Contact</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Questions about privacy can be sent to{' '}
            <a href="mailto:hello@chemdeck.com" className="font-medium text-blue-700 hover:text-blue-800">
              hello@chemdeck.com
            </a>.
          </p>
        </div>
      </div>
    </main>
  );
}

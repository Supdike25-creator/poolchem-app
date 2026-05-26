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
          <ChemDeckLogo variant="full" className="mb-6 h-10 w-auto" />
          <h1 className="text-3xl font-semibold">Terms of Service</h1>
          <p className="mt-2 text-sm text-slate-500">Last updated: May 25, 2026</p>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            These Terms of Service (&quot;Terms&quot;) govern access to and use of ChemDeck&apos;s website, web application,
            and related services (collectively, the &quot;Service&quot;). By creating an account, joining a company workspace,
            or otherwise using ChemDeck, you agree to these Terms.
          </p>

          <h2 className="mt-8 text-lg font-semibold">The Service</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            ChemDeck helps pool operators and aquatic facilities record chemical readings, manage staff access,
            monitor compliance history, and coordinate day-to-day pool operations. Features may change over time as
            we improve the product.
          </p>

          <h2 className="mt-8 text-lg font-semibold">Eligibility and accounts</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-600">
            <li>You must provide accurate account information and keep your credentials secure.</li>
            <li>You are responsible for all activity that occurs under your account.</li>
            <li>
              Access to a company workspace requires authorization from that organization&apos;s administrator or a
              valid company invite code.
            </li>
            <li>You must not share login credentials or company codes outside your organization.</li>
          </ul>

          <h2 className="mt-8 text-lg font-semibold">Organization responsibilities</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            If you are a manager or administrator, you are responsible for inviting staff, assigning pool access,
            reviewing submitted logs, and maintaining appropriate internal controls. Your organization retains
            responsibility for on-site safety, regulatory compliance, and operational decisions made using data
            recorded in ChemDeck.
          </p>

          <h2 className="mt-8 text-lg font-semibold">Acceptable use</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">You agree not to:</p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-600">
            <li>Use the Service for unlawful purposes or in violation of applicable regulations</li>
            <li>Submit false, misleading, or intentionally inaccurate chemistry records</li>
            <li>Attempt to access pools, logs, or accounts outside your authorized role</li>
            <li>Interfere with or disrupt the Service, including by probing, scraping, or overloading systems</li>
            <li>Reverse engineer or copy the Service except where permitted by law</li>
          </ul>

          <h2 className="mt-8 text-lg font-semibold">Customer content</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            You retain ownership of the operational data your organization submits to ChemDeck, including pool
            records, chemistry logs, and uploaded photos. You grant ChemDeck a limited license to host, process,
            display, and back up that content solely to provide and improve the Service.
          </p>

          <h2 className="mt-8 text-lg font-semibold">Important safety disclaimer</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            ChemDeck is an operational record-keeping and management tool. It does not replace professional
            judgment, on-site testing procedures, lifeguard protocols, or regulatory requirements. Critical safety
            decisions remain the responsibility of qualified on-site personnel and facility management.
          </p>

          <h2 className="mt-8 text-lg font-semibold">Service availability</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            We strive to keep ChemDeck available and reliable, but the Service is provided on an &quot;as is&quot; and
            &quot;as available&quot; basis. We do not guarantee uninterrupted access, error-free operation, or that the
            Service will meet every operational requirement of your facility.
          </p>

          <h2 className="mt-8 text-lg font-semibold">Disclaimer of warranties</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            To the fullest extent permitted by law, ChemDeck disclaims all warranties, whether express or implied,
            including implied warranties of merchantability, fitness for a particular purpose, and non-infringement.
          </p>

          <h2 className="mt-8 text-lg font-semibold">Limitation of liability</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            To the fullest extent permitted by law, ChemDeck and its operators will not be liable for any indirect,
            incidental, special, consequential, or punitive damages, or for any loss of profits, data, or goodwill
            arising from your use of the Service. Our total liability for any claim relating to the Service is
            limited to the amount you paid us for the Service in the twelve months before the event giving rise to
            the claim, or one hundred U.S. dollars if no fees were paid.
          </p>

          <h2 className="mt-8 text-lg font-semibold">Suspension and termination</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            We may suspend or terminate access to the Service if you violate these Terms or if continued access
            poses a security or legal risk. You may stop using ChemDeck at any time. Provisions that by their
            nature should survive termination will remain in effect.
          </p>

          <h2 className="mt-8 text-lg font-semibold">Changes to these Terms</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            We may update these Terms from time to time. When we do, we will revise the &quot;Last updated&quot; date above.
            Material changes may be communicated through the Service or by email. Continued use after changes take
            effect constitutes acceptance of the updated Terms.
          </p>

          <h2 className="mt-8 text-lg font-semibold">Contact</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Questions about these Terms can be sent to{' '}
            <a href="mailto:hello@chemdeck.com" className="font-medium text-blue-700 hover:text-blue-800">
              hello@chemdeck.com
            </a>.
          </p>
        </div>
      </div>
    </main>
  );
}

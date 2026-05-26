import Link from 'next/link';
import ChemDeckLogo from '@/components/ChemDeckLogo';

export default function CookiesPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12 text-slate-900">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-800">
          ← Back to ChemDeck
        </Link>
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <ChemDeckLogo variant="full" className="mb-6 h-10 w-auto" />
          <h1 className="text-3xl font-semibold">Cookie Policy</h1>
          <p className="mt-2 text-sm text-slate-500">Last updated: May 25, 2026</p>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            This Cookie Policy explains how ChemDeck uses cookies, browser storage, and similar technologies when
            you visit our website or use our web application (the &quot;Service&quot;). For broader information about how we
            handle personal data, see our{' '}
            <Link href="/privacy" className="font-medium text-blue-700 hover:text-blue-800">
              Privacy Policy
            </Link>.
          </p>

          <h2 className="mt-8 text-lg font-semibold">What are cookies?</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Cookies are small text files stored on your device by your browser. They help websites remember
            preferences, keep you signed in, and operate securely. ChemDeck also uses local storage for certain
            app preferences that do not need to be sent with every request.
          </p>

          <h2 className="mt-8 text-lg font-semibold">Cookies and storage we use</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-600">
            <li>
              <span className="font-medium text-slate-700">Authentication cookies:</span> Supabase session cookies
              that keep you securely signed in and allow the Service to verify your identity on each request.
            </li>
            <li>
              <span className="font-medium text-slate-700">Application session cookie:</span> a ChemDeck session
              cookie used to maintain app access state across pages during active use.
            </li>
            <li>
              <span className="font-medium text-slate-700">Onboarding and role cookies:</span> short-lived cookies
              such as pending role or company-join state used during signup and workspace onboarding flows.
            </li>
            <li>
              <span className="font-medium text-slate-700">Workspace preferences (local storage):</span> settings
              such as theme presets, calculator defaults, and pool volume preferences stored under keys like{' '}
              <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">chemdeck-settings</code>.
            </li>
            <li>
              <span className="font-medium text-slate-700">Install prompt state (local storage):</span> information
              about whether you dismissed the ChemDeck home-screen install banner so we do not show it repeatedly.
            </li>
            <li>
              <span className="font-medium text-slate-700">Offline and PWA behavior:</span> browser storage used to
              support installed app behavior and temporary offline log submission where enabled.
            </li>
          </ul>

          <h2 className="mt-8 text-lg font-semibold">Why we use them</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            These technologies are used for essential Service functionality: signing in, protecting accounts,
            remembering your preferences, routing you to the correct workspace, and supporting reliable mobile app
            installation. We do not use cookies for third-party advertising or cross-site tracking.
          </p>

          <h2 className="mt-8 text-lg font-semibold">Third-party providers</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            ChemDeck relies on Supabase for authentication and data storage. Supabase may set cookies necessary to
            manage secure sessions. Their handling of data is governed by their own policies in addition to our
            Privacy Policy.
          </p>

          <h2 className="mt-8 text-lg font-semibold">Managing cookies and storage</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Most browsers allow you to block or delete cookies through settings. You can also clear site data or
            local storage for ChemDeck from your browser. Please note that blocking or clearing authentication
            cookies will sign you out and may prevent parts of the Service from working correctly.
          </p>

          <h2 className="mt-8 text-lg font-semibold">Changes to this policy</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            We may update this Cookie Policy as our Service evolves. When we do, we will revise the &quot;Last updated&quot;
            date above.
          </p>

          <h2 className="mt-8 text-lg font-semibold">Contact</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Questions about cookies or browser storage can be sent to{' '}
            <a href="mailto:ChemdeckCo@gmail.com" className="font-medium text-blue-700 hover:text-blue-800">
              ChemdeckCo@gmail.com
            </a>.
          </p>
        </div>
      </div>
    </main>
  );
}

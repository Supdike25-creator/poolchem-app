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
          <ChemDeckLogo variant="full" className="mb-6 w-40" />
          <h1 className="text-3xl font-semibold">Cookie Policy</h1>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            ChemDeck uses cookies and browser storage to keep you signed in, remember workspace preferences,
            and support installed app behavior on mobile devices.
          </p>
          <h2 className="mt-8 text-lg font-semibold">Cookies we use</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-600">
            <li>Authentication cookies from Supabase to maintain secure sessions</li>
            <li>Application preference storage for theme and calculator defaults</li>
            <li>Install prompt dismissal state for the ChemDeck home screen app</li>
          </ul>
          <h2 className="mt-8 text-lg font-semibold">Managing cookies</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            You can clear cookies from your browser settings. Clearing authentication cookies will sign you out
            of ChemDeck.
          </p>
        </div>
      </div>
    </main>
  );
}

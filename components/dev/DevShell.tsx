import Link from 'next/link';
import { Code2, UserRoundCog, Waves } from 'lucide-react';
import ChemDeckLogo from '@/components/ChemDeckLogo';

const navItems = [
  { label: 'Worker POV', href: '/worker-view', icon: Waves },
  { label: 'Boss POV', href: '/boss-view', icon: UserRoundCog },
];

export default function DevShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200 bg-white px-4 py-5 shadow-sm lg:block">
        <div className="flex items-center gap-3">
          <ChemDeckLogo variant="mark" className="h-10 w-10" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">ChemDeck</p>
            <p className="text-lg font-semibold text-slate-950">Dev Console</p>
          </div>
        </div>
        <nav className="mt-8 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-950"
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-5 left-4 right-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
          <div className="flex items-center gap-2">
            <Code2 className="h-4 w-4 text-blue-700" />
            <p className="text-sm font-semibold text-blue-950">DEV only</p>
          </div>
          <p className="mt-1 text-xs leading-5 text-blue-900">Access is granted only by the ChemDeckDev session.</p>
        </div>
      </aside>
      <main className="lg:pl-64">
        <div className="border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <ChemDeckLogo variant="full" className="w-36" />
            <Link href="/dev-dashboard" className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
              Dev
            </Link>
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}

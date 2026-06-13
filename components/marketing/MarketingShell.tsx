'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BriefcaseBusiness, Menu, Send, X } from 'lucide-react';
import { useState } from 'react';
import ChemDeckLogo from '@/components/ChemDeckLogo';
import ScheduleDemoModal from '@/components/marketing/ScheduleDemoModal';
import { marketingFooterColumns, marketingNavLinks } from '@/components/marketing/marketingContent';

const primaryButtonClass =
  'rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700';

const outlineButtonClass =
  'rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50';

export default function MarketingShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);

  const navClass = (href: string) => {
    const active = href.startsWith('/') && pathname === href;
    return `text-sm font-medium transition ${
      active ? 'text-slate-950' : 'text-slate-600 hover:text-slate-950'
    }`;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-6">
          <Link href="/" aria-label="ChemDeck home" className="shrink-0">
            <ChemDeckLogo variant="full" className="h-10 w-auto" />
          </Link>

          <div className="hidden flex-1 items-center justify-center gap-8 md:flex">
            {marketingNavLinks.map((link) => (
              <Link key={link.label} href={link.href} prefetch className={navClass(link.href)}>
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden shrink-0 items-center gap-2 md:flex">
            <button type="button" onClick={() => setDemoOpen(true)} className={primaryButtonClass}>
              Schedule Demo
            </button>
            <Link href="/signup" prefetch className={primaryButtonClass}>
              Start Free Trial
            </Link>
            <Link href="/login" prefetch className={outlineButtonClass}>
              Log In
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setIsMenuOpen((current) => !current)}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-700 md:hidden"
            aria-label="Toggle navigation"
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </nav>

        {isMenuOpen ? (
          <div className="border-t border-slate-200 bg-white px-6 py-4 shadow-lg md:hidden">
            <div className="grid gap-3">
              {marketingNavLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  prefetch
                  onClick={() => setIsMenuOpen(false)}
                  className={`rounded-lg px-3 py-2 text-sm font-medium hover:bg-slate-50 ${
                    pathname === link.href ? 'text-slate-950' : 'text-slate-600'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <div className="mt-2 grid gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    setDemoOpen(true);
                  }}
                  className={`${primaryButtonClass} text-center`}
                >
                  Schedule Demo
                </button>
                <Link
                  href="/signup"
                  prefetch
                  onClick={() => setIsMenuOpen(false)}
                  className={`${primaryButtonClass} text-center`}
                >
                  Start Free Trial
                </Link>
                <Link
                  href="/login"
                  prefetch
                  onClick={() => setIsMenuOpen(false)}
                  className={`${outlineButtonClass} text-center`}
                >
                  Log In
                </Link>
              </div>
            </div>
          </div>
        ) : null}
      </header>

      <main className="pt-16">{children}</main>

      <footer className="border-t border-slate-800 bg-slate-950 pt-16 pb-10">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-16 grid grid-cols-2 gap-12 md:grid-cols-4">
            <div>
              <ChemDeckLogo variant="full" scheme="dark" className="h-10 w-auto" />
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-400">
                Pool chemistry management for modern aquatic facilities and operations teams.
              </p>
            </div>

            {marketingFooterColumns.map((column) => (
              <div key={column.title}>
                <p className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">{column.title}</p>
                <div className="space-y-3">
                  {column.links.map((link) => (
                    <Link key={link.label} href={link.href} className="block text-sm text-slate-500 transition hover:text-slate-300">
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-800 pt-8">
            <p className="text-sm text-slate-500">© {new Date().getFullYear()} ChemDeck. All rights reserved.</p>
            <div className="flex gap-4">
              <Link
                href="#"
                aria-label="ChemDeck on X"
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-slate-400 transition hover:bg-slate-700"
              >
                <Send className="h-4 w-4" />
              </Link>
              <Link
                href="#"
                aria-label="ChemDeck on LinkedIn"
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-slate-400 transition hover:bg-slate-700"
              >
                <BriefcaseBusiness className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

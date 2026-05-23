'use client';

import Link from 'next/link';
import {
  Bell,
  CheckCircle2,
  ClipboardList,
  Droplets,
  Menu,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { useState } from 'react';
import ChemDeckLogo from '@/components/ChemDeckLogo';

const navLinks = [
  { label: 'Features', href: '#features' },
  { label: 'Workflow', href: '#workflow' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Contact', href: 'mailto:hello@chemdeck.com' },
];

const features = [
  {
    icon: ClipboardList,
    title: 'Fast chemical logs',
    description: 'Guards record chlorine, pH, notes, and photos from any phone before the next rotation starts.',
  },
  {
    icon: Bell,
    title: 'Manager alerts',
    description: 'Out-of-range readings, missed tests, and retest reminders surface immediately for supervisors.',
  },
  {
    icon: Users,
    title: 'Team-ready roles',
    description: 'Managers get the command center. Staff get a simple field workflow built for busy pool decks.',
  },
  {
    icon: MessageSquareText,
    title: 'Staff announcements',
    description: 'Send operational notes, urgent updates, and reminders without burying them in group chats.',
  },
];

const workflow = [
  { title: 'Set up pools', description: 'Add pool types, volumes, target ranges, and staff assignments.' },
  { title: 'Log tests in the field', description: 'Staff submit readings from phones with clear prompts and validation.' },
  { title: 'Review the day', description: 'Managers audit daily logs, spot issues, and keep compliance records organized.' },
];

function StaffCharacter({ variant = 'guard' }: { variant?: 'guard' | 'manager' }) {
  const shirt = variant === 'guard' ? 'bg-[#3EC6FF]' : 'bg-[#FFD166]';
  const shorts = variant === 'guard' ? 'bg-[#0A1A2F]' : 'bg-[#2364AA]';

  return (
    <div className="relative h-48 w-28">
      <div className="absolute left-8 top-2 h-11 w-11 rounded-full bg-[#F4B886] ring-4 ring-white" />
      <div className="absolute left-5 top-0 h-9 w-16 rounded-t-full bg-[#23324A]" />
      <div className="absolute left-9 top-[4.25rem] h-20 w-12 rounded-2xl bg-white shadow-sm">
        <div className={`mx-auto mt-2 h-14 w-9 rounded-xl ${shirt}`} />
      </div>
      <div className={`absolute left-9 top-32 h-8 w-5 rounded-b-lg ${shorts}`} />
      <div className={`absolute left-16 top-32 h-8 w-5 rounded-b-lg ${shorts}`} />
      <div className="absolute left-4 top-24 h-4 w-14 -rotate-12 rounded-full bg-[#F4B886]" />
      <div className="absolute left-[4.5rem] top-24 h-4 w-14 rotate-12 rounded-full bg-[#F4B886]" />
      <div className="absolute left-8 top-[9.75rem] h-14 w-3 rounded-full bg-[#F4B886]" />
      <div className="absolute left-[5.25rem] top-[9.75rem] h-14 w-3 rounded-full bg-[#F4B886]" />
      <div className="absolute left-4 top-[11rem] h-5 w-12 rounded-full bg-[#0A1A2F]" />
      <div className="absolute left-[4.25rem] top-[11rem] h-5 w-12 rounded-full bg-[#0A1A2F]" />
    </div>
  );
}

function PoolIllustration() {
  return (
    <div className="relative mx-auto aspect-[1.2] w-full max-w-xl overflow-hidden rounded-[2rem] border border-[#B9EFFF] bg-[#EAF9FF] p-5 shadow-[0_24px_60px_rgba(10,26,47,0.14)]">
      <div className="absolute inset-x-7 bottom-8 h-36 rounded-[50%] bg-[#3EC6FF] shadow-inner" />
      <div className="absolute inset-x-12 bottom-14 h-20 rounded-[50%] bg-[#7FE1FF]" />
      <div className="absolute bottom-[6.5rem] left-12 h-3 w-32 rounded-full bg-white/70" />
      <div className="absolute bottom-[4.75rem] right-16 h-3 w-28 rounded-full bg-white/70" />

      <div className="absolute left-8 top-12 scale-90">
        <StaffCharacter variant="guard" />
      </div>
      <div className="absolute right-10 top-9 scale-90">
        <StaffCharacter variant="manager" />
      </div>

      <div className="absolute left-1/2 top-8 w-44 -translate-x-1/2 rounded-2xl border border-[#D9E1E8] bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#3EC6FF]/20 text-[#0A1A2F]">
            <Droplets className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-[#0A1A2F]">Main Pool</p>
            <p className="text-[10px] text-slate-500">10:00 AM check</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-center text-xs font-bold text-[#0A1A2F]">
          <div className="rounded-lg bg-[#F2FBFF] p-2">Cl 2.4</div>
          <div className="rounded-lg bg-[#F2FBFF] p-2">pH 7.4</div>
        </div>
      </div>

      <div className="absolute bottom-7 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-[#0A1A2F] shadow-sm">
        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        All pools on track
      </div>
    </div>
  );
}

export default function Home() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <main className="min-h-screen bg-[#F5FBFF] text-[#0A1A2F]">
      <header className="sticky top-0 z-50 border-b border-[#D7EEF8] bg-white/90 backdrop-blur">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link href="/" aria-label="ChemDeck home">
            <ChemDeckLogo variant="full" className="w-[9.5rem] sm:w-44" />
          </Link>

          <div className="hidden items-center gap-7 md:flex">
            {navLinks.map((link) => (
              <Link key={link.label} href={link.href} className="text-sm font-semibold text-slate-600 transition hover:text-[#0A1A2F]">
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <Link href="/login" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-[#0A1A2F] transition hover:border-[#3EC6FF] hover:bg-[#F2FBFF]">
              Log in
            </Link>
            <Link href="/login" className="rounded-lg bg-[#3EC6FF] px-4 py-2 text-sm font-bold text-[#0A1A2F] transition hover:bg-[#7FE1FF]">
              Start free
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setIsMenuOpen((current) => !current)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-[#0A1A2F] md:hidden"
            aria-label="Toggle navigation"
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </nav>

        {isMenuOpen ? (
          <div className="border-t border-[#D7EEF8] bg-white px-5 py-4 md:hidden">
            <div className="grid gap-2">
              {navLinks.map((link) => (
                <Link key={link.label} href={link.href} onClick={() => setIsMenuOpen(false)} className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-[#F2FBFF]">
                  {link.label}
                </Link>
              ))}
              <Link href="/login" onClick={() => setIsMenuOpen(false)} className="mt-2 rounded-lg bg-[#3EC6FF] px-4 py-3 text-center text-sm font-bold text-[#0A1A2F]">
                Log in
              </Link>
            </div>
          </div>
        ) : null}
      </header>

      <section className="overflow-hidden px-5 py-16 sm:px-8 lg:py-24">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#B9EFFF] bg-white px-4 py-2 text-sm font-bold text-[#2364AA] shadow-sm">
              <Sparkles className="h-4 w-4 text-[#3EC6FF]" />
              Friendly pool operations software
            </div>
            <h1 className="max-w-2xl text-5xl font-black leading-[1.02] tracking-tight text-[#0A1A2F] sm:text-6xl">
              Keep pool teams on task and swimmers safe.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
              ChemDeck helps managers coordinate lifeguards, chemical logs, announcements, and daily pool status from one cheerful workspace.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/login" className="inline-flex h-12 items-center justify-center rounded-xl bg-[#3EC6FF] px-6 text-sm font-black text-[#0A1A2F] transition hover:bg-[#7FE1FF]">
                Open ChemDeck
              </Link>
              <Link href="#features" className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-6 text-sm font-bold text-[#0A1A2F] transition hover:border-[#3EC6FF] hover:bg-[#F2FBFF]">
                See features
              </Link>
            </div>
            <div className="mt-8 grid max-w-lg grid-cols-3 gap-3 text-center">
              {['Fast logs', 'Smart alerts', 'Phone ready'].map((item) => (
                <div key={item} className="rounded-2xl border border-[#D7EEF8] bg-white p-3 text-xs font-bold text-slate-600 shadow-sm">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <PoolIllustration />
        </div>
      </section>

      <section id="features" className="px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#2364AA]">Built for pool days</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-[#0A1A2F] sm:text-4xl">Everything staff need, without the clutter.</h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-slate-600">A clean dashboard for managers and a simple mobile flow for guards working on the deck.</p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <article key={feature.title} className="rounded-[1.4rem] border border-[#D7EEF8] bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E7F8FF] text-[#2364AA]">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-black text-[#0A1A2F]">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{feature.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="workflow" className="bg-[#0A1A2F] px-5 py-20 text-white sm:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#3EC6FF]">Workflow</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">A calmer way to run a busy pool team.</h2>
              <p className="mt-4 text-sm leading-6 text-[#D9E1E8]/75">From opening checks to afternoon retests, ChemDeck keeps the day organized and visible.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {workflow.map((step, index) => (
                <article key={step.title} className="rounded-2xl border border-white/10 bg-white/[0.06] p-5">
                  <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-[#3EC6FF] text-sm font-black text-[#0A1A2F]">{index + 1}</div>
                  <h3 className="font-black">{step.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#D9E1E8]/70">{step.description}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-5xl rounded-[2rem] border border-[#B9EFFF] bg-white p-8 text-center shadow-sm sm:p-12">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E7F8FF] text-[#2364AA]">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h2 className="text-3xl font-black tracking-tight text-[#0A1A2F]">Simple pricing is coming soon.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-slate-600">We are opening early access for pool companies that want cleaner logs, better staff communication, and real-time operations visibility.</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="mailto:hello@chemdeck.com" className="inline-flex h-12 items-center justify-center rounded-xl bg-[#3EC6FF] px-6 text-sm font-black text-[#0A1A2F] transition hover:bg-[#7FE1FF]">
              Request early access
            </Link>
            <Link href="/login" className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-200 px-6 text-sm font-bold text-[#0A1A2F] transition hover:bg-[#F2FBFF]">
              Log in
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#D7EEF8] bg-white px-5 py-10 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <ChemDeckLogo variant="full" className="w-40" />
            <p className="mt-2 text-sm text-slate-500">Pool operations that feel organized, friendly, and fast.</p>
          </div>
          <div className="flex flex-wrap gap-4 text-sm font-semibold text-slate-500">
            <Link href="#features" className="hover:text-[#0A1A2F]">Features</Link>
            <Link href="#workflow" className="hover:text-[#0A1A2F]">Workflow</Link>
            <Link href="mailto:hello@chemdeck.com" className="hover:text-[#0A1A2F]">Contact</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

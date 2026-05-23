'use client';

import Link from 'next/link';
import {
  BarChart3,
  Bell,
  BriefcaseBusiness,
  ClipboardList,
  Menu,
  Send,
  ShieldCheck,
  Smartphone,
  Users,
  X,
} from 'lucide-react';
import { useState } from 'react';
import ChemDeckLogo from '@/components/ChemDeckLogo';

const navLinks = [
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'About', href: '#about' },
  { label: 'Contact', href: 'mailto:hello@chemdeck.com' },
];

const features = [
  {
    icon: ClipboardList,
    title: 'Digital Chemical Logs',
    description: 'Guards submit pH, chlorine, and alkalinity readings directly from their phone. No paper, no manual entry.',
  },
  {
    icon: Bell,
    title: 'Instant Alerts',
    description: 'Get notified the moment a pool reading falls out of range or a scheduled test is missed.',
  },
  {
    icon: Users,
    title: 'Team Management',
    description: 'Invite guards, assign them to specific pools, and manage your entire team from one dashboard.',
  },
  {
    icon: BarChart3,
    title: 'Compliance Reports',
    description: 'Generate health inspection reports in seconds. Stay audit-ready without the paperwork.',
  },
  {
    icon: ShieldCheck,
    title: 'Role-Based Access',
    description: 'Admins see everything. Guards see only their assigned pools. Everyone has exactly the right access.',
  },
  {
    icon: Smartphone,
    title: 'Works On Any Device',
    description: 'Optimized for phones in the field. No app download required - just open a browser and log.',
  },
];

const steps = [
  {
    title: 'Create Your Organization',
    description: 'Sign up and name your company. You become the admin and owner of your ChemDeck workspace.',
  },
  {
    title: 'Invite Your Team',
    description: 'Send email invites to guards and managers. They join with one click - no separate signup needed.',
  },
  {
    title: 'Start Logging',
    description: 'Guards submit readings from the field. You get real-time visibility across every pool, instantly.',
  },
];

const footerColumns = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'Pricing', href: '#pricing' },
      { label: 'Security', href: '#' },
      // TODO: Replace placeholder once changelog exists.
      { label: 'Changelog', href: '#' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '#about' },
      { label: 'Contact', href: 'mailto:hello@chemdeck.com' },
      // TODO: Add careers page.
      { label: 'Careers', href: '#' },
      // TODO: Add blog.
      { label: 'Blog', href: '#' },
    ],
  },
  {
    title: 'Legal',
    links: [
      // TODO: Add legal pages.
      { label: 'Privacy Policy', href: '#' },
      { label: 'Terms of Service', href: '#' },
      { label: 'Cookie Policy', href: '#' },
    ],
  },
];

const SkeletonLines = ({ count, dark = false }: { count: number; dark?: boolean }) => {
  const widths = ['w-3/4', 'w-1/2', 'w-2/3', 'w-5/6', 'w-7/12'];

  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={`h-3 rounded ${dark ? 'bg-slate-800' : 'bg-slate-100'} ${widths[index % widths.length]}`} />
      ))}
    </div>
  );
};

export default function Home() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <main className="min-h-screen scroll-smooth bg-slate-50 text-slate-950">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" aria-label="ChemDeck home">
            <ChemDeckLogo variant="full" className="w-36" />
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <Link key={link.label} href={link.href} className="text-sm font-medium text-slate-600 transition hover:text-slate-950">
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <Link
              href="/login"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Log In
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              Get Started
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setIsMenuOpen((current) => !current)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 md:hidden"
            aria-label="Toggle navigation"
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </nav>

        {isMenuOpen ? (
          <div className="border-t border-slate-200 bg-white px-6 py-4 shadow-lg md:hidden">
            <div className="grid gap-3">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setIsMenuOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                >
                  {link.label}
                </Link>
              ))}
              <div className="mt-2 grid grid-cols-2 gap-3">
                <Link
                  href="/login"
                  onClick={() => setIsMenuOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Log In
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setIsMenuOpen(false)}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-blue-700"
                >
                  Get Started
                </Link>
              </div>
            </div>
          </div>
        ) : null}
      </header>

      <section
        className="bg-white pt-32 pb-24"
        style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(37,99,235,0.08) 0%, transparent 70%)' }}
      >
        <div className="mx-auto max-w-4xl px-6 text-center">
          <div className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            Pool Chemistry Management Platform
          </div>
          <h1 className="mx-auto mt-6 max-w-3xl text-center text-4xl font-bold leading-tight tracking-tight text-slate-950 sm:text-5xl">
            Keep Every Pool <span className="text-blue-600">Safe.</span>
            <br />
            Every Test <span className="text-blue-600">On Time.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-center text-lg leading-relaxed text-slate-500">
            ChemDeck gives pool companies a smarter way to manage chemical logs, track compliance, and keep every guard
            accountable - from any device, in real time.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="/signup"
              className="rounded-xl bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              Get Started Free
            </Link>
            <Link
              href="#features"
              className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-base font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              See How It Works
            </Link>
          </div>
          <p className="mt-6 text-center text-sm text-slate-400">No credit card required · Setup in under 5 minutes</p>
        </div>

        <div className="mx-auto mt-16 max-w-5xl px-6">
          <div className="flex aspect-video items-center justify-center rounded-2xl border border-t-4 border-slate-200 border-t-blue-600 bg-slate-100 shadow-[0_32px_80px_rgba(15,23,42,0.12)]">
            {/* TODO: Replace with real app screenshot. */}
            <p className="text-sm text-slate-400">[ App Screenshot Coming Soon ]</p>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-slate-50 py-12">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <p className="mb-8 text-sm font-semibold uppercase tracking-widest text-slate-400">
            Trusted by pool operations teams
          </p>
          <div className="flex flex-wrap justify-center gap-6 lg:gap-12">
            {/* TODO: Replace with real client logos. */}
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="rounded-lg border border-slate-200 bg-white px-8 py-4 text-sm font-medium text-slate-300">
                [ Partner Logo ]
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="bg-white py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Features</p>
            <h2 className="mb-4 text-3xl font-bold text-slate-950">Everything your team needs in one platform</h2>
            <p className="mx-auto mb-16 max-w-xl text-slate-500">
              Track tests, manage teams, and surface compliance issues before they become operational headaches.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;

              return (
                <article
                  key={feature.title}
                  className="rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-slate-300 hover:shadow-md"
                >
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="mb-2 text-base font-semibold text-slate-950">{feature.title}</h3>
                  <p className="text-sm leading-relaxed text-slate-500">{feature.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="about" className="border-y border-slate-200 bg-slate-50 py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-blue-600">How It Works</p>
          <h2 className="text-3xl font-bold text-slate-950">Up and running in minutes</h2>
          <p className="mt-4 text-slate-500">No IT team required. No complicated setup.</p>

          <div className="mt-16 flex flex-col gap-8 md:flex-row md:items-start md:gap-0">
            {steps.map((step, index) => (
              <div key={step.title} className="contents md:flex md:flex-1 md:items-start">
                <div className="flex-1 px-8 text-center">
                  <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">
                    {index + 1}
                  </div>
                  <h3 className="mb-2 text-base font-semibold text-slate-950">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-slate-500">{step.description}</p>
                </div>
                {index < steps.length - 1 ? <div className="mt-6 hidden flex-1 border-t-2 border-dashed border-slate-300 md:block" /> : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="bg-white py-24">
        <div className="mx-auto max-w-5xl px-6 text-center">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Pricing</p>
          <h2 className="text-3xl font-bold text-slate-950">Simple, transparent pricing</h2>
          <p className="mx-auto mt-4 mb-4 max-w-xl text-center text-slate-500">
            Plans for every size operation - from a single facility to a large multi-site company.
          </p>
          <div className="mb-16 inline-block rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700">
            🚧 Pricing coming soon - contact us for early access
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <article className="rounded-2xl border border-slate-200 bg-white p-8 text-left">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">Starter</span>
              <h3 className="mt-4 text-4xl font-bold text-slate-950">Coming Soon</h3>
              <p className="mt-1 text-sm text-slate-500">Per month, billed monthly</p>
              <div className="my-6 border-t border-slate-200" />
              <SkeletonLines count={3} />
              <Link
                href="/signup"
                className="mt-8 inline-flex w-full justify-center rounded-xl border border-slate-300 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Get Started
              </Link>
            </article>

            <article className="relative overflow-hidden rounded-2xl border-2 border-blue-600 bg-white p-8 text-left">
              <span className="absolute top-4 right-4 rounded-full bg-blue-600 px-3 py-1 text-xs text-white">Most Popular</span>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-700">Pro</span>
              <h3 className="mt-4 text-4xl font-bold text-slate-950">Coming Soon</h3>
              <p className="mt-1 text-sm text-slate-500">Per month, billed monthly</p>
              <div className="my-6 border-t border-slate-200" />
              <SkeletonLines count={5} />
              <Link
                href="/signup"
                className="mt-8 inline-flex w-full justify-center rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Get Started
              </Link>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-slate-950 p-8 text-left">
              <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">Enterprise</span>
              <h3 className="mt-4 text-4xl font-bold text-white">Custom Pricing</h3>
              <p className="mt-1 text-sm text-slate-400">Tailored to your operation</p>
              <div className="my-6 border-t border-slate-800" />
              <SkeletonLines count={5} dark />
              <Link
                href="mailto:hello@chemdeck.com"
                className="mt-8 inline-flex w-full justify-center rounded-xl border border-slate-700 py-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-800"
              >
                Contact Us
              </Link>
            </article>
          </div>
        </div>
      </section>

      <section
        className="bg-slate-950 py-24 text-white"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      >
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h2 className="mb-4 text-4xl font-bold text-white">Ready to modernize your pool operations?</h2>
          <p className="mb-10 text-lg text-slate-400">
            Join pool companies already using ChemDeck to stay compliant, keep guards accountable, and protect swimmers.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/signup" className="rounded-xl bg-blue-600 px-8 py-3 font-semibold text-white transition hover:bg-blue-500">
              Get Started Free
            </Link>
            <Link
              href="mailto:hello@chemdeck.com"
              className="rounded-xl border border-slate-700 px-8 py-3 font-semibold text-slate-300 transition hover:bg-slate-800"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-800 bg-slate-950 pt-16 pb-10">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-16 grid grid-cols-2 gap-12 md:grid-cols-4">
            <div>
              <ChemDeckLogo variant="full" className="w-36 brightness-0 invert" />
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-400">
                Pool chemistry management for modern aquatic facilities and operations teams.
              </p>
            </div>

            {footerColumns.map((column) => (
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
            <p className="text-sm text-slate-500">© 2025 ChemDeck. All rights reserved.</p>
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
    </main>
  );
}

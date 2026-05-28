'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { usePathname } from 'next/navigation';
import { Code2 } from 'lucide-react';
import ChemDeckLogo from '@/components/ChemDeckLogo';
import DevLogoutButton from '@/components/dev/DevLogoutButton';
import DevPerspectiveCylinder from '@/components/dev/DevPerspectiveCylinder';
import {
  DevPerspectiveProvider,
  useDevPerspective,
} from '@/components/dev/DevPerspectiveProvider';
import { devPerspectiveMeta } from '@/lib/devPerspective';
import type { SidebarNavItem } from '@/components/SidebarNav';

function isActiveItem(pathname: string, item: SidebarNavItem) {
  const matches = item.match ?? [item.href.split('?')[0]];
  return matches.some((match) => pathname === match || pathname.startsWith(`${match}/`));
}

function SidebarNavLink({ item }: { item: SidebarNavItem }) {
  const pathname = usePathname();
  const active = isActiveItem(pathname, item);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={`group flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-all ${
        active
          ? 'bg-blue-50 text-blue-800 ring-1 ring-blue-200'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
      }`}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span className="sidebar-label truncate whitespace-nowrap">{item.label}</span>
    </Link>
  );
}

function DevShellSidebarInner() {
  const { perspective, selectPerspective, items } = useDevPerspective();
  const meta = devPerspectiveMeta[perspective];

  return (
    <aside className="sidebar-rail group fixed left-0 top-0 z-30 flex h-screen w-16 overflow-hidden border-r border-slate-200 bg-white shadow-sm transition-[width] duration-200 ease-out hover:w-64 focus-within:w-64">
      <div className="flex h-full w-full flex-col overflow-hidden p-3">
        <div className="mb-4 min-h-[74px]">
          <ChemDeckLogo variant="mark" className="h-10 w-10 group-hover:hidden group-focus-within:hidden" />
          <div className="sidebar-label hidden min-w-0 group-hover:block group-focus-within:block">
            <ChemDeckLogo variant="full" className="w-40" />
            <p className="mt-1 truncate text-sm font-semibold text-slate-950">Dev Console</p>
          </div>
        </div>

        <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-2 group-hover:px-3 group-focus-within:px-3">
          <p className="sidebar-label mb-2 hidden text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 group-hover:block group-focus-within:block">
            Perspective
          </p>
          <div className="flex justify-center group-hover:justify-start group-focus-within:justify-start">
            <DevPerspectiveCylinder value={perspective} onChange={selectPerspective} compact />
          </div>
          <p className="sidebar-label mt-2 hidden text-xs font-semibold text-slate-700 group-hover:block group-focus-within:block">
            {meta.description}
          </p>
        </div>

        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto" aria-label="Dev navigation">
          {items.map((item) => (
            <SidebarNavLink key={`${perspective}-${item.href}-${item.label}`} item={item} />
          ))}
        </nav>

        <div className="mt-auto space-y-3 pt-4">
          <DevLogoutButton />
          <div className="sidebar-label sidebar-footer rounded-lg border border-blue-200 bg-blue-50 p-3">
            <div className="flex items-center gap-2">
              <Code2 className="h-4 w-4 text-blue-700" />
              <p className="text-sm font-semibold text-blue-950">DEV only</p>
            </div>
            <p className="mt-1 text-xs leading-5 text-blue-900">ChemDeckDev session access.</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default function DevShellSidebar() {
  return (
    <Suspense fallback={null}>
      <DevPerspectiveProvider>
        <DevShellSidebarInner />
      </DevPerspectiveProvider>
    </Suspense>
  );
}

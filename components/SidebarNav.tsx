'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import {
  buildDevPreviewNavItems,
  buildGuardNavItems,
  buildManagerNavItems,
  guardNavItems,
  mainNavItems,
  type SidebarNavItem,
} from '@/lib/sidebarNavItems';

export type { SidebarNavItem } from '@/lib/sidebarNavItems';
export { buildDevPreviewNavItems, buildGuardNavItems, buildManagerNavItems, guardNavItems, mainNavItems };

const isActiveItem = (pathname: string, item: SidebarNavItem) => {
  const matches = item.match ?? [item.href];
  return matches.some((match) => pathname === match || pathname.startsWith(`${match}/`));
};

function NavLink({ item, compact = false }: { item: SidebarNavItem; compact?: boolean }) {
  const pathname = usePathname();
  const active = isActiveItem(pathname, item);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      data-sound="click"
      aria-current={active ? 'page' : undefined}
      className={
        compact
          ? `flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[11px] font-semibold transition-colors ${
              active ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
            }`
          : `group flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-all ${
              active
                ? 'bg-blue-50 text-blue-800 ring-1 ring-blue-200'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
            }`
      }
    >
      <Icon className={compact ? 'h-4 w-4 shrink-0' : 'h-5 w-5 shrink-0'} />
      <span className={compact ? 'truncate' : 'sidebar-label truncate whitespace-nowrap'}>
        {compact && item.label === 'Announcements' ? 'News' : compact && item.label === 'Settings' ? 'Prefs' : item.label}
      </span>
    </Link>
  );
}

export function SidebarNav({
  header,
  beforeNav,
  footer,
  className = '',
  expanded = false,
  items = mainNavItems,
  showMobileSidebar = false,
  devPerspective,
}: {
  header?: ReactNode;
  beforeNav?: ReactNode;
  footer?: ReactNode;
  className?: string;
  expanded?: boolean;
  items?: SidebarNavItem[];
  showMobileSidebar?: boolean;
  devPerspective?: 'dev' | 'manager' | 'lifeguard';
}) {
  return (
    <>
      <aside
        data-dev-perspective={devPerspective}
        className={`sidebar-rail group fixed left-0 top-0 z-50 h-screen overflow-hidden border-r border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.06)] transition-[width,box-shadow] duration-200 ease-out ${expanded ? 'sidebar-expanded w-64' : 'w-16 hover:w-64 focus-within:w-64'} ${showMobileSidebar ? 'flex' : 'hidden lg:flex'} ${className}`}
      >
        <div className="flex h-full w-full flex-col overflow-hidden p-3">
          {header ? <div className="mb-5">{header}</div> : null}
          {beforeNav ? <div>{beforeNav}</div> : null}
          <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto" aria-label="Primary navigation">
            {items.map((item) => (
              <NavLink key={`${item.label}-${item.href}`} item={item} />
            ))}
          </nav>
          {footer ? <div className="mt-auto pt-5">{footer}</div> : null}
        </div>
      </aside>

      {!showMobileSidebar ? (
        <nav
          className="fixed inset-x-3 bottom-3 z-40 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-[0_18px_50px_rgba(15,23,42,0.16)] backdrop-blur lg:hidden"
          aria-label="Primary mobile navigation"
        >
          <div className="flex items-center gap-1">
            {items.map((item) => (
              <NavLink key={item.href} item={item} compact />
            ))}
          </div>
        </nav>
      ) : null}
    </>
  );
}

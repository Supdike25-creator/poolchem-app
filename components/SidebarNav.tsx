'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bell,
  ClipboardList,
  ClipboardPlus,
  FileSpreadsheet,
  Gauge,
  LayoutDashboard,
  Megaphone,
  Settings,
  Users,
  Waves,
} from 'lucide-react';
import type { ComponentType, ReactNode } from 'react';

type SidebarNavItem = {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  match?: string[];
};

export const mainNavItems: SidebarNavItem[] = [
  { label: 'Overview', href: '/management/dashboard', icon: LayoutDashboard, match: ['/dashboard', '/management/dashboard'] },
  { label: 'Submit Log', href: '/log', icon: ClipboardPlus, match: ['/log', '/guard/log'] },
  { label: 'Review Logs', href: '/management/logs', icon: ClipboardList, match: ['/management/logs', '/guard/review'] },
  { label: 'Alerts', href: '/management/alerts', icon: Bell, match: ['/management/alerts'] },
  { label: 'Compliance', href: '/management/compliance', icon: FileSpreadsheet, match: ['/management/compliance'] },
  { label: 'Pools', href: '/management/pools', icon: Waves, match: ['/management/pools'] },
  { label: 'Team', href: '/management/team', icon: Users, match: ['/management/team'] },
  { label: 'Announcements', href: '/management/announcements', icon: Megaphone, match: ['/management/announcements'] },
  { label: 'Settings', href: '/management/settings', icon: Settings, match: ['/management/settings', '/dashboard/settings'] },
];

export const guardNavItems: SidebarNavItem[] = [
  { label: 'Overview', href: '/guard', icon: LayoutDashboard, match: ['/guard', '/worker-view'] },
  { label: 'Submit Log', href: '/guard/log', icon: ClipboardPlus, match: ['/guard/log'] },
  { label: 'Review Logs', href: '/guard/review', icon: ClipboardList, match: ['/guard/review'] },
  { label: 'News', href: '/guard/announcements', icon: Megaphone, match: ['/guard/announcements'] },
];

export const buildDevPreviewNavItems = (companyId?: string | null): SidebarNavItem[] => [
  {
    label: 'Dev Dashboard',
    href: companyId ? `/dev-dashboard?companyId=${encodeURIComponent(companyId)}` : '/dev-dashboard',
    icon: Gauge,
    match: ['/dev-dashboard', '/dev-admin'],
  },
];

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
        {compact && item.label === 'Announcements' ? 'News' : item.label}
      </span>
    </Link>
  );
}

export function SidebarNav({
  header,
  footer,
  className = '',
  expanded = false,
  items = mainNavItems,
}: {
  header?: ReactNode;
  footer?: ReactNode;
  className?: string;
  expanded?: boolean;
  items?: SidebarNavItem[];
}) {
  return (
    <>
      <aside
        className={`sidebar-rail group fixed left-0 top-0 z-50 hidden h-screen overflow-hidden border-r border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.06)] transition-[width,box-shadow] duration-200 ease-out lg:flex ${expanded ? 'sidebar-expanded w-64' : 'w-16 hover:w-64 focus-within:w-64'} ${className}`}
      >
        <div className="flex h-full w-full flex-col overflow-hidden p-3">
          {header ? <div className="mb-5">{header}</div> : null}
          <nav className="space-y-1" aria-label="Primary navigation">
            {items.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </nav>
          {footer ? <div className="mt-auto pt-5">{footer}</div> : null}
        </div>
      </aside>

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
    </>
  );
}

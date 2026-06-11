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
import type { ComponentType } from 'react';

export type SidebarNavItem = {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  match?: string[];
};

export const mainNavItems: SidebarNavItem[] = [
  { label: 'Overview', href: '/management/dashboard', icon: LayoutDashboard, match: ['/dashboard', '/management/dashboard'] },
  { label: 'Submit Log', href: '/log', icon: ClipboardPlus, match: ['/log', '/employee/log'] },
  { label: 'Review Logs', href: '/management/logs', icon: ClipboardList, match: ['/management/logs', '/employee/review'] },
  { label: 'Alerts', href: '/management/alerts', icon: Bell, match: ['/management/alerts'] },
  { label: 'Compliance', href: '/management/compliance', icon: FileSpreadsheet, match: ['/management/compliance'] },
  { label: 'Pools', href: '/management/pools', icon: Waves, match: ['/management/pools'] },
  { label: 'Team', href: '/management/team', icon: Users, match: ['/management/team'] },
  { label: 'Announcements', href: '/management/announcements', icon: Megaphone, match: ['/management/announcements'] },
  { label: 'Settings', href: '/management/settings', icon: Settings, match: ['/management/settings', '/dashboard/settings'] },
];

export const buildManagerNavItems = (companyId?: string | null): SidebarNavItem[] => {
  const query = companyId ? `?companyId=${encodeURIComponent(companyId)}` : '';
  const overviewHref = companyId ? `/manager-view${query}` : '/management/dashboard';

  return [
    {
      label: 'Overview',
      href: overviewHref,
      icon: LayoutDashboard,
      match: ['/dashboard', '/management/dashboard', '/manager-view', '/boss-view'],
    },
    {
      label: 'Submit Log',
      href: `/log${query}`,
      icon: ClipboardPlus,
      match: ['/log', '/employee/log'],
    },
    {
      label: 'Review Logs',
      href: `/management/logs${query}`,
      icon: ClipboardList,
      match: ['/management/logs', '/employee/review'],
    },
    {
      label: 'Alerts',
      href: `/management/alerts${query}`,
      icon: Bell,
      match: ['/management/alerts'],
    },
    {
      label: 'Compliance',
      href: `/management/compliance${query}`,
      icon: FileSpreadsheet,
      match: ['/management/compliance'],
    },
    {
      label: 'Pools',
      href: `/management/pools${query}`,
      icon: Waves,
      match: ['/management/pools'],
    },
    {
      label: 'Team',
      href: `/management/team${query}`,
      icon: Users,
      match: ['/management/team'],
    },
    {
      label: 'Announcements',
      href: `/management/announcements${query}`,
      icon: Megaphone,
      match: ['/management/announcements'],
    },
    {
      label: 'Settings',
      href: `/management/settings${query}`,
      icon: Settings,
      match: ['/management/settings', '/dashboard/settings'],
    },
  ];
};

export const buildGuardNavItems = (companyId?: string | null): SidebarNavItem[] => {
  const query = companyId ? `?companyId=${encodeURIComponent(companyId)}` : '';

  return [
    {
      label: 'Overview',
      href: `/employee${query}`,
      icon: LayoutDashboard,
      match: ['/employee', '/worker-view'],
    },
    {
      label: 'Submit Log',
      href: `/employee/log${query}`,
      icon: ClipboardPlus,
      match: ['/employee/log'],
    },
    {
      label: 'Review Logs',
      href: `/employee/review${query}`,
      icon: ClipboardList,
      match: ['/employee/review'],
    },
    {
      label: 'News',
      href: `/employee/announcements${query}`,
      icon: Megaphone,
      match: ['/employee/announcements'],
    },
    {
      label: 'Settings',
      href: `/employee/settings${query}`,
      icon: Settings,
      match: ['/employee/settings'],
    },
  ];
};

/** @deprecated use buildGuardNavItems() */
export const guardNavItems = buildGuardNavItems();

export const buildDevPreviewNavItems = (companyId?: string | null): SidebarNavItem[] => [
  {
    label: 'Dev Dashboard',
    href: companyId ? `/dev-dashboard?companyId=${encodeURIComponent(companyId)}` : '/dev-dashboard',
    icon: Gauge,
    match: ['/dev-dashboard', '/dev-admin'],
  },
];

export const toNavRouteLinks = (items: SidebarNavItem[], description?: string) =>
  items.map((item) => ({
    label: item.label,
    url: item.href,
    description,
  }));

import {
  Building2,
  FlaskConical,
  Gauge,
  Settings,
  SlidersHorizontal,
  Users,
  Waves,
} from 'lucide-react';
import {
  buildGuardNavItems,
  buildManagerNavItems,
  type SidebarNavItem,
} from '@/lib/sidebarNavItems';

export type DevPerspective = 'dev' | 'manager' | 'employee';

export const DEV_PERSPECTIVE_STORAGE_KEY = 'chemdeck.devPerspective';

export const devPerspectiveMeta: Record<
  DevPerspective,
  { label: string; letter: string; modeClass: string; description: string }
> = {
  dev: {
    label: 'Dev',
    letter: 'D',
    modeClass: 'dev-pov-mode-dev',
    description: 'Dashboard & admin',
  },
  manager: {
    label: 'Manager',
    letter: 'M',
    modeClass: 'dev-pov-mode-manager',
    description: 'Pools, team & alerts',
  },
  employee: {
    label: 'Employee',
    letter: 'E',
    modeClass: 'dev-pov-mode-lifeguard',
    description: 'Log tests & schedule',
  },
};

export const buildDevHotbarItems = (companyId?: string | null): SidebarNavItem[] => [
  {
    label: 'Dev Dash',
    href: companyId ? `/dev-dashboard?companyId=${encodeURIComponent(companyId)}` : '/dev-dashboard',
    icon: Gauge,
    match: ['/dev-dashboard'],
  },
  {
    label: 'Test Lab',
    href: companyId ? `/dev-dashboard/test-lab?companyId=${encodeURIComponent(companyId)}` : '/dev-dashboard/test-lab',
    icon: FlaskConical,
    match: ['/dev-dashboard/test-lab'],
  },
  {
    label: 'Settings',
    href: companyId ? `/dev-dashboard/settings?companyId=${encodeURIComponent(companyId)}` : '/dev-dashboard/settings',
    icon: Settings,
    match: ['/dev-dashboard/settings'],
  },
  { label: 'Profiles', href: '/dev-admin/profiles', icon: Users, match: ['/dev-admin/profiles'] },
  { label: 'Companies', href: '/dev-admin/companies', icon: Building2, match: ['/dev-admin/companies'] },
  { label: 'Pools', href: '/dev-admin/pools', icon: Waves, match: ['/dev-admin/pools'] },
  { label: 'System', href: '/dev-admin/system-controls', icon: SlidersHorizontal, match: ['/dev-admin/system-controls'] },
];

export const buildPerspectiveNavItems = (
  perspective: DevPerspective,
  companyId?: string | null,
): SidebarNavItem[] => {
  switch (perspective) {
    case 'manager':
      return buildManagerNavItems(companyId);
    case 'employee':
      return buildGuardNavItems(companyId);
    default:
      return buildDevHotbarItems(companyId);
  }
};

export const perspectiveHomePath = (perspective: DevPerspective, companyId?: string | null) => {
  const query = companyId ? `?companyId=${encodeURIComponent(companyId)}` : '';
  switch (perspective) {
    case 'manager':
      return `/manager-view${query}`;
    case 'employee':
      return `/worker-view${query}`;
    default:
      return companyId ? `/dev-dashboard?companyId=${encodeURIComponent(companyId)}` : '/dev-dashboard';
  }
};

export const detectPerspectiveFromPath = (pathname: string): DevPerspective => {
  if (pathname.startsWith('/worker-view') || pathname.startsWith('/employee')) {
    return 'employee';
  }

  if (
    pathname.startsWith('/manager-view') ||
    pathname.startsWith('/boss-view') ||
    pathname.startsWith('/management')
  ) {
    return 'manager';
  }

  return 'dev';
};

export const readStoredPerspective = (fallback: DevPerspective) => {
  if (typeof window === 'undefined') return fallback;
  const stored = window.localStorage.getItem(DEV_PERSPECTIVE_STORAGE_KEY);
  if (stored === 'dev' || stored === 'manager' || stored === 'employee' || stored === 'lifeguard') {
    return stored === 'lifeguard' ? 'employee' : (stored as DevPerspective);
  }
  return fallback;
};

export const storePerspective = (perspective: DevPerspective) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(DEV_PERSPECTIVE_STORAGE_KEY, perspective);
};

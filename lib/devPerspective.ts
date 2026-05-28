import {
  Building2,
  Gauge,
  LayoutDashboard,
  SlidersHorizontal,
  Users,
  Waves,
} from 'lucide-react';
import {
  buildGuardNavItems,
  buildManagerNavItems,
  type SidebarNavItem,
} from '@/components/SidebarNav';

export type DevPerspective = 'dev' | 'manager' | 'lifeguard';

export const DEV_PERSPECTIVE_STORAGE_KEY = 'chemdeck.devPerspective';

export const devPerspectiveMeta: Record<
  DevPerspective,
  { label: string; letter: string; tone: string; activeTone: string; description: string }
> = {
  dev: {
    label: 'Dev',
    letter: 'D',
    tone: 'bg-slate-900 text-white',
    activeTone: 'bg-slate-950 text-white ring-2 ring-blue-400',
    description: 'Dev console & admin tools',
  },
  manager: {
    label: 'Manager',
    letter: 'M',
    tone: 'bg-emerald-600 text-white',
    activeTone: 'bg-emerald-700 text-white ring-2 ring-emerald-300',
    description: 'Full management workspace',
  },
  lifeguard: {
    label: 'Lifeguard',
    letter: 'L',
    tone: 'bg-sky-600 text-white',
    activeTone: 'bg-sky-700 text-white ring-2 ring-sky-300',
    description: 'Lifeguard workbench',
  },
};

export const buildDevHotbarItems = (companyId?: string | null): SidebarNavItem[] => {
  const query = companyId ? `?companyId=${encodeURIComponent(companyId)}` : '';
  return [
    {
      label: 'Dev Dash',
      href: companyId ? `/dev-dashboard?companyId=${encodeURIComponent(companyId)}` : '/dev-dashboard',
      icon: Gauge,
      match: ['/dev-dashboard'],
    },
    { label: 'Profiles', href: '/dev-admin/profiles', icon: Users, match: ['/dev-admin/profiles'] },
    { label: 'Companies', href: '/dev-admin/companies', icon: Building2, match: ['/dev-admin/companies'] },
    { label: 'Pools', href: '/dev-admin/pools', icon: Waves, match: ['/dev-admin/pools'] },
    { label: 'System', href: '/dev-admin/system-controls', icon: SlidersHorizontal, match: ['/dev-admin/system-controls'] },
    {
      label: 'Mgr POV',
      href: `/manager-view${query}`,
      icon: LayoutDashboard,
      match: ['/manager-view', '/boss-view'],
    },
    {
      label: 'Lfg POV',
      href: `/worker-view${query}`,
      icon: Waves,
      match: ['/worker-view'],
    },
  ];
};

export const buildPerspectiveNavItems = (
  perspective: DevPerspective,
  companyId?: string | null,
): SidebarNavItem[] => {
  switch (perspective) {
    case 'manager':
      return buildManagerNavItems(companyId);
    case 'lifeguard':
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
    case 'lifeguard':
      return `/worker-view${query}`;
    default:
      return companyId ? `/dev-dashboard?companyId=${encodeURIComponent(companyId)}` : '/dev-dashboard';
  }
};

export const detectPerspectiveFromPath = (pathname: string): DevPerspective => {
  if (pathname.startsWith('/worker-view') || pathname.startsWith('/guard')) {
    return 'lifeguard';
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
  if (stored === 'dev' || stored === 'manager' || stored === 'lifeguard') {
    return stored;
  }
  return fallback;
};

export const storePerspective = (perspective: DevPerspective) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(DEV_PERSPECTIVE_STORAGE_KEY, perspective);
};

'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  buildPerspectiveNavItems,
  detectPerspectiveFromPath,
  perspectiveHomePath,
  readStoredPerspective,
  storePerspective,
  type DevPerspective,
} from '@/lib/devPerspective';
import type { SidebarNavItem } from '@/components/SidebarNav';

type DevPerspectiveContextValue = {
  perspective: DevPerspective;
  setPerspective: (next: DevPerspective) => void;
  selectPerspective: (next: DevPerspective) => void;
  items: SidebarNavItem[];
  companyId: string | null;
};

const DevPerspectiveContext = createContext<DevPerspectiveContextValue | null>(null);

export function DevPerspectiveProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const companyId = searchParams.get('companyId');
  const routePerspective = detectPerspectiveFromPath(pathname);
  const [perspective, setPerspectiveState] = useState<DevPerspective>(routePerspective);

  useEffect(() => {
    if (pathname.startsWith('/dev-dashboard') || pathname.startsWith('/dev-admin')) {
      setPerspectiveState(readStoredPerspective('dev'));
      return;
    }
    setPerspectiveState(detectPerspectiveFromPath(pathname));
  }, [pathname]);

  const setPerspective = useCallback((next: DevPerspective) => {
    setPerspectiveState(next);
    storePerspective(next);
  }, []);

  const selectPerspective = useCallback(
    (next: DevPerspective) => {
      if (next === perspective) {
        router.push(perspectiveHomePath(next, companyId));
        return;
      }
      setPerspective(next);
    },
    [companyId, perspective, router, setPerspective],
  );

  const items = useMemo(
    () => buildPerspectiveNavItems(perspective, companyId),
    [perspective, companyId],
  );

  const value = useMemo(
    () => ({
      perspective,
      setPerspective,
      selectPerspective,
      items,
      companyId,
    }),
    [perspective, setPerspective, selectPerspective, items, companyId],
  );

  return <DevPerspectiveContext.Provider value={value}>{children}</DevPerspectiveContext.Provider>;
}

export function useDevPerspective() {
  const context = useContext(DevPerspectiveContext);
  if (!context) {
    throw new Error('useDevPerspective must be used within DevPerspectiveProvider');
  }
  return context;
}

export function useOptionalDevPerspective() {
  return useContext(DevPerspectiveContext);
}

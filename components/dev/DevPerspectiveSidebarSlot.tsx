'use client';

import { Suspense } from 'react';
import DevPerspectiveCylinder from '@/components/dev/DevPerspectiveCylinder';
import {
  DevPerspectiveProvider,
  useDevPerspective,
} from '@/components/dev/DevPerspectiveProvider';

function DevPerspectiveSidebarSlotInner() {
  const { perspective, selectPerspective } = useDevPerspective();

  return (
    <div className="dev-pov-sidebar-slot mb-3">
      <p className="sidebar-label mb-2 hidden text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 group-hover:block group-focus-within:block">
        Perspective
      </p>
      <DevPerspectiveCylinder value={perspective} onChange={selectPerspective} compact />
    </div>
  );
}

export function DevPerspectiveSidebarSlot() {
  return (
    <Suspense fallback={null}>
      <DevPerspectiveSidebarSlotInner />
    </Suspense>
  );
}

export function DevPerspectiveAuthShell({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<>{children}</>}>
      <DevPerspectiveProvider>{children}</DevPerspectiveProvider>
    </Suspense>
  );
}

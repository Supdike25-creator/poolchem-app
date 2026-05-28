'use client';

import { Suspense } from 'react';
import DevPerspectiveCylinder from '@/components/dev/DevPerspectiveCylinder';
import {
  DevPerspectiveProvider,
  useDevPerspective,
} from '@/components/dev/DevPerspectiveProvider';
import { devPerspectiveMeta } from '@/lib/devPerspective';

function DevPerspectiveSidebarSlotInner() {
  const { perspective, selectPerspective } = useDevPerspective();
  const meta = devPerspectiveMeta[perspective];

  return (
    <div className="dev-pov-sidebar-slot mb-3">
      <p className="sidebar-label mb-2 hidden text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 group-hover:block group-focus-within:block">
        Perspective
      </p>
      <DevPerspectiveCylinder value={perspective} onChange={selectPerspective} compact />
      <p className="sidebar-label mt-2 hidden text-xs font-semibold text-slate-700 group-hover:block group-focus-within:block">
        {meta.description}
      </p>
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

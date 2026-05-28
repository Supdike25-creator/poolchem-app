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

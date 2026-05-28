'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import DevPerspectiveCylinder from '@/components/dev/DevPerspectiveCylinder';
import {
  buildPerspectiveNavItems,
  detectPerspectiveFromPath,
  devPerspectiveMeta,
  perspectiveHomePath,
  readStoredPerspective,
  storePerspective,
  type DevPerspective,
} from '@/lib/devPerspective';

function isActiveItem(pathname: string, href: string, match?: string[]) {
  const paths = match ?? [href.split('?')[0]];
  return paths.some((entry) => pathname === entry || pathname.startsWith(`${entry}/`));
}

function DevPreviewHotbarInner() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const companyId = searchParams.get('companyId');
  const pathnamePerspective = detectPerspectiveFromPath(pathname);
  const [perspective, setPerspective] = useState<DevPerspective>(pathnamePerspective);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (pathname.startsWith('/dev-dashboard') || pathname.startsWith('/dev-admin')) {
      setPerspective(readStoredPerspective('dev'));
      return;
    }
    setPerspective(detectPerspectiveFromPath(pathname));
  }, [pathname]);

  const items = useMemo(
    () => buildPerspectiveNavItems(perspective, companyId),
    [perspective, companyId],
  );

  const handlePerspectiveChange = (next: DevPerspective) => {
    if (next === perspective) {
      router.push(perspectiveHomePath(next, companyId));
      return;
    }

    setAnimating(true);
    setPerspective(next);
    storePerspective(next);
    window.setTimeout(() => setAnimating(false), 650);
  };

  const activeMeta = devPerspectiveMeta[perspective];

  return (
    <div className="dev-preview-hotbar pointer-events-none fixed inset-x-0 bottom-0 z-[70] px-3 pb-3">
      <div className="pointer-events-auto mx-auto flex max-w-7xl items-end gap-3">
        <div className="dev-preview-hotbar-cylinder shrink-0 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-[0_18px_50px_rgba(15,23,42,0.18)] backdrop-blur">
          <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            POV
          </p>
          <DevPerspectiveCylinder value={perspective} onChange={handlePerspectiveChange} spinning={animating} />
        </div>

        <div className="dev-preview-hotbar-track min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-[0_18px_50px_rgba(15,23,42,0.18)] backdrop-blur">
          <div className="mb-2 flex items-center justify-between gap-2 px-1">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Hotbar</p>
              <p className="text-sm font-semibold text-slate-950">{activeMeta.description}</p>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${activeMeta.activeTone}`}>
              {activeMeta.letter}
            </span>
          </div>

          <div className="dev-preview-hotbar-scroll flex items-center gap-1 overflow-x-auto pb-1">
            {items.map((item) => {
              const Icon = item.icon;
              const active = isActiveItem(pathname, item.href, item.match);
              return (
                <Link
                  key={`${perspective}-${item.href}-${item.label}`}
                  href={item.href}
                  data-sound="click"
                  aria-current={active ? 'page' : undefined}
                  className={`inline-flex min-w-[4.75rem] shrink-0 flex-col items-center justify-center gap-1 rounded-xl px-2.5 py-2 text-[11px] font-semibold transition-all ${
                    active
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">
                    {item.label === 'Announcements' ? 'News' : item.label === 'Settings' ? 'Prefs' : item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DevPreviewHotbar() {
  return (
    <Suspense fallback={null}>
      <DevPreviewHotbarInner />
    </Suspense>
  );
}

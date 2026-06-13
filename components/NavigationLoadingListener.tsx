'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import ChemDeckLoadingScreen from '@/components/ChemDeckLoadingScreen';
import { isMarketingPath } from '@/components/marketing/marketingContent';

function NavigationLoadingListenerInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const routeKey = `${pathname}?${searchParams.toString()}`;
  const previousRouteKey = useRef(routeKey);

  useEffect(() => {
    if (previousRouteKey.current !== routeKey) {
      setLoading(false);
      previousRouteKey.current = routeKey;
    }
  }, [routeKey]);

  useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const anchor = (event.target as HTMLElement | null)?.closest('a');
      if (!anchor) return;
      if (anchor.target === '_blank' || anchor.hasAttribute('download')) return;

      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
        return;
      }

      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }

      if (url.origin !== window.location.origin) return;

      const destination = `${url.pathname}${url.search}`;
      const current = `${window.location.pathname}${window.location.search}`;
      if (destination === current) return;

      if (isMarketingPath(url.pathname) || isMarketingPath(window.location.pathname)) {
        return;
      }

      setLoading(true);
    };

    document.addEventListener('click', onDocumentClick, true);
    return () => document.removeEventListener('click', onDocumentClick, true);
  }, []);

  if (!loading) return null;

  return <ChemDeckLoadingScreen variant="overlay" message="Loading ChemDeck…" />;
}

export default function NavigationLoadingListener() {
  return (
    <Suspense fallback={null}>
      <NavigationLoadingListenerInner />
    </Suspense>
  );
}

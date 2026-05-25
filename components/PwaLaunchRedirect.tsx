'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { routeForRole, normalizeProfileRole } from '@/lib/auth/accountAccess';
import { isStandaloneApp } from '@/lib/pwa';

export default function PwaLaunchRedirect() {
  const router = useRouter();

  useEffect(() => {
    if (!isStandaloneApp()) return;
    if (typeof window === 'undefined') return;
    if (!window.location.search.includes('homescreen=1')) return;

    const redirectIfSignedIn = async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) return;

      const response = await fetch('/api/current-account', { cache: 'no-store' });
      const result = await response.json().catch(() => null);
      const role = normalizeProfileRole(result?.account?.role ?? null);
      router.replace(routeForRole(role));
    };

    void redirectIfSignedIn();
  }, [router]);

  return null;
}

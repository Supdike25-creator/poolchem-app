'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

const storageKey = 'chemdeck.dev.selectedCompanyId';

export function useDevCompanyScope() {
  const searchParams = useSearchParams();
  const urlCompanyId = searchParams.get('companyId');
  const [storedCompanyId, setStoredCompanyId] = useState<string | null>(null);

  useEffect(() => {
    setStoredCompanyId(window.localStorage.getItem(storageKey));
  }, []);

  const companyId = urlCompanyId || storedCompanyId;
  const query = companyId ? `?companyId=${encodeURIComponent(companyId)}` : '';

  return { companyId, query };
}

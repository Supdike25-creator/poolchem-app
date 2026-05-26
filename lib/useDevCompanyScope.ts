'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

const storageKey = 'chemdeck.dev.selectedCompanyId';

const readStoredCompanyId = () => {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(storageKey);
};

export function useDevCompanyScope() {
  const searchParams = useSearchParams();
  const urlCompanyId = searchParams.get('companyId');
  const [storedCompanyId, setStoredCompanyId] = useState<string | null>(readStoredCompanyId);

  useEffect(() => {
    const syncStoredCompany = () => {
      setStoredCompanyId(readStoredCompanyId());
    };

    syncStoredCompany();
    window.addEventListener('storage', syncStoredCompany);
    window.addEventListener('chemdeck-dev-company-change', syncStoredCompany);

    return () => {
      window.removeEventListener('storage', syncStoredCompany);
      window.removeEventListener('chemdeck-dev-company-change', syncStoredCompany);
    };
  }, []);

  const companyId = urlCompanyId || storedCompanyId;
  const query = companyId ? `?companyId=${encodeURIComponent(companyId)}` : '';

  return { companyId, query };
};

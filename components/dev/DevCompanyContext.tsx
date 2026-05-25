'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';

type DevCompanyContextValue = {
  selectedCompanyId: string;
  setSelectedCompanyId: (companyId: string) => void;
};

const storageKey = 'chemdeck.dev.selectedCompanyId';
const DevCompanyContext = createContext<DevCompanyContextValue | null>(null);

export function DevCompanyProvider({ children }: { children: React.ReactNode }) {
  const [selectedCompanyId, setSelectedCompanyIdState] = useState(() => {
    if (typeof window === 'undefined') return '';
    return window.localStorage.getItem(storageKey) ?? '';
  });

  const setSelectedCompanyId = useCallback((companyId: string) => {
    setSelectedCompanyIdState(companyId);
    if (companyId) {
      window.localStorage.setItem(storageKey, companyId);
    } else {
      window.localStorage.removeItem(storageKey);
    }
  }, []);

  const value = useMemo(() => ({ selectedCompanyId, setSelectedCompanyId }), [selectedCompanyId, setSelectedCompanyId]);

  return <DevCompanyContext.Provider value={value}>{children}</DevCompanyContext.Provider>;
}

export function useDevCompany() {
  const context = useContext(DevCompanyContext);
  if (!context) {
    throw new Error('useDevCompany must be used inside DevCompanyProvider');
  }
  return context;
}

'use client';

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from 'react';
import { isUuid } from '@/lib/devCompanyScope';

type DevCompanyContextValue = {
  selectedCompanyId: string;
  setSelectedCompanyId: (companyId: string) => void;
  hydrated: boolean;
};

const storageKey = 'chemdeck.dev.selectedCompanyId';
const changeEvent = 'chemdeck-dev-company-change';
const DevCompanyContext = createContext<DevCompanyContextValue | null>(null);

const readStoredCompanyId = () => {
  if (typeof window === 'undefined') return '';
  const stored = window.localStorage.getItem(storageKey) ?? '';
  if (stored && !isUuid(stored)) {
    window.localStorage.removeItem(storageKey);
    return '';
  }
  return stored;
};

const subscribe = (onStoreChange: () => void) => {
  window.addEventListener('storage', onStoreChange);
  window.addEventListener(changeEvent, onStoreChange);
  return () => {
    window.removeEventListener('storage', onStoreChange);
    window.removeEventListener(changeEvent, onStoreChange);
  };
};

export function DevCompanyProvider({ children }: { children: React.ReactNode }) {
  const selectedCompanyId = useSyncExternalStore(subscribe, readStoredCompanyId, () => '');
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);

  const setSelectedCompanyId = useCallback((companyId: string) => {
    if (companyId) {
      window.localStorage.setItem(storageKey, companyId);
    } else {
      window.localStorage.removeItem(storageKey);
    }
    window.dispatchEvent(new Event(changeEvent));
  }, []);

  const value = useMemo(
    () => ({ selectedCompanyId, setSelectedCompanyId, hydrated }),
    [selectedCompanyId, setSelectedCompanyId, hydrated],
  );

  return <DevCompanyContext.Provider value={value}>{children}</DevCompanyContext.Provider>;
}

export function useDevCompany() {
  const context = useContext(DevCompanyContext);
  if (!context) {
    throw new Error('useDevCompany must be used inside DevCompanyProvider');
  }
  return context;
}

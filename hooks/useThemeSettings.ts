'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  persistThemePreference,
  readStoredThemePreference,
  resolveThemeMode,
} from '@/lib/styleTheme';

export function useThemeSettings() {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('light');
  const [hydrated, setHydrated] = useState(false);

  const sync = useCallback(() => {
    setTheme(readStoredThemePreference());
    setHydrated(true);
  }, []);

  useEffect(() => {
    sync();
    window.addEventListener('chemdeck-settings-change', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('chemdeck-settings-change', sync);
      window.removeEventListener('storage', sync);
    };
  }, [sync]);

  const setThemeMode = useCallback((nextTheme: 'light' | 'dark' | 'system') => {
    setTheme(nextTheme);
    persistThemePreference(nextTheme);
    document.documentElement.dataset.themePreference = nextTheme;
    document.documentElement.dataset.theme = resolveThemeMode(nextTheme);
    window.dispatchEvent(new Event('chemdeck-settings-change'));
  }, []);

  return { hydrated, theme, setThemeMode };
}

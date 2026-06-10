'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_BRAND_COLOR,
  applyBrandColor,
  normalizeHex,
  persistBrandColor,
  persistThemePreference,
  readStoredBrandColor,
  readStoredThemePreference,
} from '@/lib/styleTheme';

export function useStyleThemeSettings() {
  const [brandColor, setBrandColor] = useState<string | null>(null);
  const [draftColor, setDraftColor] = useState(DEFAULT_BRAND_COLOR);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('light');
  const [hydrated, setHydrated] = useState(false);

  const sync = useCallback(() => {
    const storedColor = readStoredBrandColor();
    const storedTheme = readStoredThemePreference();
    setBrandColor(storedColor);
    setDraftColor(storedColor ?? DEFAULT_BRAND_COLOR);
    setTheme(storedTheme);
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

  const applyDraftColor = useCallback(
    (hex: string, applyLive = true) => {
      const normalized = normalizeHex(hex);
      if (!normalized) return;
      setDraftColor(normalized);
      setBrandColor(normalized);
      persistBrandColor(normalized);
      if (applyLive) {
        applyBrandColor(normalized, theme);
      }
    },
    [theme],
  );

  const setThemeMode = useCallback(
    (nextTheme: 'light' | 'dark' | 'system') => {
      setTheme(nextTheme);
      persistThemePreference(nextTheme);
      document.documentElement.dataset.themePreference = nextTheme;
      if (nextTheme === 'system') {
        document.documentElement.dataset.theme = window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';
      } else {
        document.documentElement.dataset.theme = nextTheme;
      }
      applyBrandColor(brandColor ?? draftColor, nextTheme);
      window.dispatchEvent(new Event('chemdeck-settings-change'));
    },
    [brandColor, draftColor],
  );

  const resetToDefault = useCallback(() => {
    setBrandColor(null);
    setDraftColor(DEFAULT_BRAND_COLOR);
    persistBrandColor(null);
    applyBrandColor(null, theme);
    window.dispatchEvent(new Event('chemdeck-settings-change'));
  }, [theme]);

  return {
    hydrated,
    brandColor,
    draftColor,
    theme,
    previewColor: brandColor ?? draftColor,
    usingCustom: Boolean(brandColor),
    applyDraftColor,
    setThemeMode,
    resetToDefault,
  };
}

'use client';

import { useEffect } from 'react';
import {
  applyBrandColor,
  clearBrandPalette,
  readStoredBrandColor,
  resolveThemeMode,
} from '@/lib/styleTheme';
import { isDevSessionActive } from '@/lib/isDevSessionClient';

type Theme = 'light' | 'dark' | 'system';
type StylePreset = 'default' | 'compact' | 'contrast' | 'soft';

const getStoredSettings = () => {
  try {
    const savedSettings = localStorage.getItem('chemdeck-settings');
    return savedSettings ? JSON.parse(savedSettings) : {};
  } catch {
    return {};
  }
};

const getStoredTheme = (): Theme => {
  const theme = getStoredSettings()?.theme;
  return theme === 'light' || theme === 'dark' || theme === 'system' ? theme : 'light';
};

const getStoredStyle = (): StylePreset => {
  const stylePreset = getStoredSettings()?.stylePreset;
  return stylePreset === 'compact' || stylePreset === 'contrast' || stylePreset === 'soft' ? stylePreset : 'default';
};

const applyTheme = (theme: Theme) => {
  document.documentElement.dataset.theme = resolveThemeMode(theme);
  document.documentElement.dataset.themePreference = theme;
};

const applyStyle = (stylePreset: StylePreset) => {
  document.documentElement.dataset.style = stylePreset;
};

const applyLargerText = (enabled: boolean) => {
  if (enabled) {
    document.documentElement.dataset.largerText = 'true';
  } else {
    delete document.documentElement.dataset.largerText;
  }
};

export default function ThemeManager() {
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const syncTheme = () => {
      const settings = getStoredSettings();
      const theme = getStoredTheme();
      applyTheme(theme);
      applyStyle(getStoredStyle());
      applyLargerText(Boolean(settings.largerTextMode));
      if (isDevSessionActive()) {
        applyBrandColor(readStoredBrandColor(), theme);
      } else {
        clearBrandPalette();
      }
    };

    syncTheme();
    window.addEventListener('storage', syncTheme);
    window.addEventListener('chemdeck-settings-change', syncTheme);
    mediaQuery.addEventListener('change', syncTheme);

    return () => {
      window.removeEventListener('storage', syncTheme);
      window.removeEventListener('chemdeck-settings-change', syncTheme);
      mediaQuery.removeEventListener('change', syncTheme);
    };
  }, []);

  return null;
}

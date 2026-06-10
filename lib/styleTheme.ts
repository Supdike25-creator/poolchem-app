export const resolveThemeMode = (theme: 'light' | 'dark' | 'system') => {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
};

export const clearBrandPalette = () => {
  const root = document.documentElement;
  for (const key of ['accent', 'secondary', 'primary', 'surface', 'background', 'border', 'foreground']) {
    root.style.removeProperty(`--${key}`);
  }
  delete root.dataset.brandCustom;
};

export const readStoredThemePreference = (): 'light' | 'dark' | 'system' => {
  try {
    const settings = JSON.parse(localStorage.getItem('chemdeck-settings') ?? '{}') as { theme?: string };
    return settings.theme === 'dark' || settings.theme === 'system' ? settings.theme : 'light';
  } catch {
    return 'light';
  }
};

export const persistThemePreference = (theme: 'light' | 'dark' | 'system') => {
  try {
    const settings = JSON.parse(localStorage.getItem('chemdeck-settings') ?? '{}') as Record<string, unknown>;
    settings.theme = theme;
    delete settings.brandColor;
    localStorage.setItem('chemdeck-settings', JSON.stringify(settings));
    window.dispatchEvent(new Event('chemdeck-settings-change'));
  } catch {
    // ignore storage failures
  }
};

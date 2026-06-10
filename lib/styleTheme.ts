export const DEFAULT_BRAND_COLOR = '#0ea5e9';

export type BrandPalette = {
  accent: string;
  secondary: string;
  primary: string;
  surface: string;
  background: string;
  border: string;
  foreground: string;
};

export type Rgb = { r: number; g: number; b: number };
export type Hsl = { h: number; s: number; l: number };

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const normalizeHex = (value: string) => {
  const raw = value.trim().replace('#', '');
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(raw)) return null;
  const expanded =
    raw.length === 3 ? raw.split('').map((char) => `${char}${char}`).join('') : raw;
  return `#${expanded.toLowerCase()}`;
};

export const hexToRgb = (hex: string): Rgb | null => {
  const normalized = normalizeHex(hex);
  if (!normalized) return null;
  const value = normalized.slice(1);
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
};

export const rgbToHex = ({ r, g, b }: Rgb) =>
  `#${[r, g, b]
    .map((channel) => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, '0'))
    .join('')}`;

export const rgbToHsl = ({ r, g, b }: Rgb): Hsl => {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case rn:
        h = ((gn - bn) / delta) % 6;
        break;
      case gn:
        h = (bn - rn) / delta + 2;
        break;
      default:
        h = (rn - gn) / delta + 4;
        break;
    }
    h *= 60;
    if (h < 0) h += 360;
  }

  return { h, s: s * 100, l: l * 100 };
};

export const hslToRgb = ({ h, s, l }: Hsl): Rgb => {
  const sn = clamp(s, 0, 100) / 100;
  const ln = clamp(l, 0, 100) / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = ln - c / 2;

  let rn = 0;
  let gn = 0;
  let bn = 0;

  if (h < 60) [rn, gn, bn] = [c, x, 0];
  else if (h < 120) [rn, gn, bn] = [x, c, 0];
  else if (h < 180) [rn, gn, bn] = [0, c, x];
  else if (h < 240) [rn, gn, bn] = [0, x, c];
  else if (h < 300) [rn, gn, bn] = [x, 0, c];
  else [rn, gn, bn] = [c, 0, x];

  return {
    r: (rn + m) * 255,
    g: (gn + m) * 255,
    b: (bn + m) * 255,
  };
};

export const hslToHex = (hsl: Hsl) => rgbToHex(hslToRgb(hsl));

export const hexToHsl = (hex: string) => {
  const rgb = hexToRgb(hex);
  return rgb ? rgbToHsl(rgb) : null;
};

export const generateBrandPalette = (hex: string, isDark: boolean): BrandPalette => {
  const hsl = hexToHsl(hex) ?? hexToHsl(DEFAULT_BRAND_COLOR)!;
  const hue = hsl.h;
  const sat = clamp(hsl.s, 42, 92);

  if (isDark) {
    return {
      accent: hslToHex({ h: hue, s: sat, l: 58 }),
      secondary: hslToHex({ h: hue, s: clamp(sat - 8, 35, 85), l: 42 }),
      primary: hslToHex({ h: hue, s: clamp(sat - 18, 28, 70), l: 24 }),
      surface: hslToHex({ h: hue, s: 18, l: 11 }),
      background: hslToHex({ h: hue, s: 22, l: 6 }),
      border: hslToHex({ h: hue, s: 14, l: 24 }),
      foreground: hslToHex({ h: hue, s: 12, l: 92 }),
    };
  }

  return {
    accent: hslToHex({ h: hue, s: sat, l: clamp(hsl.l, 44, 52) }),
    secondary: hslToHex({ h: hue, s: clamp(sat - 4, 40, 88), l: clamp(hsl.l - 10, 36, 46) }),
    primary: hslToHex({ h: hue, s: clamp(sat - 12, 32, 75), l: clamp(hsl.l - 24, 20, 32) }),
    surface: hslToHex({ h: hue, s: 36, l: 97 }),
    background: '#ffffff',
    border: hslToHex({ h: hue, s: 24, l: 86 }),
    foreground: hslToHex({ h: hue, s: 28, l: 14 }),
  };
};

const paletteVars: Array<keyof BrandPalette> = [
  'accent',
  'secondary',
  'primary',
  'surface',
  'background',
  'border',
  'foreground',
];

export const applyBrandPalette = (palette: BrandPalette) => {
  const root = document.documentElement;
  for (const key of paletteVars) {
    root.style.setProperty(`--${key}`, palette[key]);
  }
  root.dataset.brandCustom = 'true';
};

export const clearBrandPalette = () => {
  const root = document.documentElement;
  for (const key of paletteVars) {
    root.style.removeProperty(`--${key}`);
  }
  delete root.dataset.brandCustom;
};

export const resolveThemeMode = (theme: 'light' | 'dark' | 'system') => {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
};

export const applyBrandColor = (hex: string | null | undefined, theme: 'light' | 'dark' | 'system') => {
  const normalized = hex ? normalizeHex(hex) : null;
  if (!normalized) {
    clearBrandPalette();
    return;
  }

  const isDark = resolveThemeMode(theme) === 'dark';
  applyBrandPalette(generateBrandPalette(normalized, isDark));
};

export const readStoredBrandColor = () => {
  try {
    const settings = JSON.parse(localStorage.getItem('chemdeck-settings') ?? '{}') as { brandColor?: string | null };
    const normalized = settings.brandColor ? normalizeHex(settings.brandColor) : null;
    return normalized;
  } catch {
    return null;
  }
};

export const persistBrandColor = (brandColor: string | null) => {
  try {
    const settings = JSON.parse(localStorage.getItem('chemdeck-settings') ?? '{}') as Record<string, unknown>;
    if (brandColor) {
      settings.brandColor = normalizeHex(brandColor);
    } else {
      delete settings.brandColor;
    }
    localStorage.setItem('chemdeck-settings', JSON.stringify(settings));
    window.dispatchEvent(new Event('chemdeck-settings-change'));
  } catch {
    // ignore storage failures
  }
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
    localStorage.setItem('chemdeck-settings', JSON.stringify(settings));
    window.dispatchEvent(new Event('chemdeck-settings-change'));
  } catch {
    // ignore storage failures
  }
};

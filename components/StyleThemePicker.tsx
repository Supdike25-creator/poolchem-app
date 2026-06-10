'use client';

import { useEffect, useState } from 'react';
import { Monitor, Moon, Palette, RotateCcw, Sun, X } from 'lucide-react';
import ColorWheelPicker from '@/components/ColorWheelPicker';
import {
  DEFAULT_BRAND_COLOR,
  applyBrandColor,
  normalizeHex,
  persistBrandColor,
  persistThemePreference,
  readStoredBrandColor,
  readStoredThemePreference,
} from '@/lib/styleTheme';

const quickSwatches = ['#0ea5e9', '#10b981', '#8b5cf6', '#f97316', '#ef4444', '#ec4899', '#14b8a6', '#eab308'];

export default function StyleThemePicker() {
  const [open, setOpen] = useState(false);
  const [brandColor, setBrandColor] = useState<string | null>(null);
  const [draftColor, setDraftColor] = useState(DEFAULT_BRAND_COLOR);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('light');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const sync = () => {
      const storedColor = readStoredBrandColor();
      const storedTheme = readStoredThemePreference();
      setBrandColor(storedColor);
      setDraftColor(storedColor ?? DEFAULT_BRAND_COLOR);
      setTheme(storedTheme);
      applyBrandColor(storedColor, storedTheme);
      setHydrated(true);
    };

    sync();
    window.addEventListener('chemdeck-settings-change', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('chemdeck-settings-change', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const applyDraftColor = (hex: string) => {
    const normalized = normalizeHex(hex);
    if (!normalized) return;
    setDraftColor(normalized);
    setBrandColor(normalized);
    persistBrandColor(normalized);
    applyBrandColor(normalized, theme);
  };

  const setThemeMode = (nextTheme: 'light' | 'dark' | 'system') => {
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
  };

  const resetToDefault = () => {
    setBrandColor(null);
    setDraftColor(DEFAULT_BRAND_COLOR);
    persistBrandColor(null);
    applyBrandColor(null, theme);
  };

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  if (!hydrated) return null;

  const previewColor = brandColor ?? draftColor;
  const usingCustom = Boolean(brandColor);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="style-theme-fab group fixed bottom-3 left-3 z-50 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/70 bg-white/95 text-slate-800 shadow-[0_12px_32px_rgba(15,23,42,0.18)] backdrop-blur transition hover:scale-105 hover:shadow-[0_16px_36px_rgba(15,23,42,0.24)]"
        aria-label="Open style and color settings"
        title="Style & colors"
      >
        <span
          className="absolute inset-0 rounded-2xl opacity-80"
          style={{
            background: `conic-gradient(from 180deg, ${previewColor}, #ffffff, ${previewColor})`,
            mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            maskComposite: 'exclude',
            WebkitMaskComposite: 'xor',
            padding: '2px',
          }}
        />
        <Palette className="relative h-5 w-5" style={{ color: previewColor }} />
      </button>

      {open ? (
        <div className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/55 p-4 backdrop-blur-sm sm:items-center">
          <button
            type="button"
            className="absolute inset-0"
            aria-label="Close style panel"
            onClick={() => setOpen(false)}
          />

          <section className="relative z-[121] w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.28)]">
            <div
              className="border-b border-slate-200 px-5 py-4 text-white"
              style={{
                background: `linear-gradient(135deg, ${previewColor}, color-mix(in srgb, ${previewColor} 65%, #0f172a))`,
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/75">Style system</p>
                  <h2 className="mt-1 text-xl font-semibold tracking-tight">Pick your ChemDeck shade</h2>
                  <p className="mt-1 text-sm text-white/85">
                    The whole app adopts this color. Dark mode deepens the same hue.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/25 bg-white/10 text-white transition hover:bg-white/20"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-5 p-5">
              <ColorWheelPicker value={draftColor} onChange={applyDraftColor} />

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Quick shades</p>
                <div className="flex flex-wrap gap-2">
                  {quickSwatches.map((swatch) => (
                    <button
                      key={swatch}
                      type="button"
                      onClick={() => applyDraftColor(swatch)}
                      className={`h-9 w-9 rounded-full border-2 transition hover:scale-105 ${
                        previewColor === swatch ? 'border-slate-900 ring-2 ring-slate-300' : 'border-white shadow-sm'
                      }`}
                      style={{ backgroundColor: swatch }}
                      aria-label={`Use ${swatch}`}
                    />
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Theme</p>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { id: 'light', label: 'Light', icon: Sun },
                    { id: 'dark', label: 'Dark', icon: Moon },
                    { id: 'system', label: 'System', icon: Monitor },
                  ] as const).map((option) => {
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setThemeMode(option.id)}
                        className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition ${
                          theme === option.id
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">Live preview</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-lg px-3 py-2 text-sm font-semibold text-white" style={{ backgroundColor: previewColor }}>
                    Primary action
                  </span>
                  <span
                    className="rounded-lg border px-3 py-2 text-sm font-semibold"
                    style={{ borderColor: previewColor, color: previewColor }}
                  >
                    Accent text
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={resetToDefault}
                  disabled={!usingCustom}
                  className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RotateCcw className="h-4 w-4" />
                  Back to default
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex h-11 flex-1 items-center justify-center rounded-xl px-4 text-sm font-semibold text-white transition hover:opacity-90"
                  style={{ backgroundColor: previewColor }}
                >
                  Done
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

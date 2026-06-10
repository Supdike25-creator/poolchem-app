'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Palette, X } from 'lucide-react';
import StyleThemeSettingsSection from '@/components/StyleThemeSettingsSection';
import { useStyleThemeSettings } from '@/hooks/useStyleThemeSettings';

export default function StyleThemePicker() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { hydrated, previewColor } = useStyleThemeSettings();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  if (!hydrated || pathname.includes('/settings')) return null;

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

            <div className="max-h-[70vh] space-y-5 overflow-y-auto p-5">
              <StyleThemeSettingsSection compact />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-11 w-full items-center justify-center rounded-xl px-4 text-sm font-semibold text-white transition hover:opacity-90"
                style={{ backgroundColor: previewColor }}
              >
                Done
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

'use client';

import { Monitor, Moon, Palette, RotateCcw, Sun } from 'lucide-react';
import ColorWheelPicker from '@/components/ColorWheelPicker';
import { useStyleThemeSettings } from '@/hooks/useStyleThemeSettings';
import { isDevSessionActive } from '@/lib/isDevSessionClient';

const quickSwatches = ['#0ea5e9', '#10b981', '#8b5cf6', '#f97316', '#ef4444', '#ec4899', '#14b8a6', '#eab308'];

type StyleThemeSettingsSectionProps = {
  showBrandColors?: boolean;
  compact?: boolean;
};

export default function StyleThemeSettingsSection({
  showBrandColors = isDevSessionActive(),
  compact = false,
}: StyleThemeSettingsSectionProps) {
  const {
    hydrated,
    previewColor,
    draftColor,
    theme,
    usingCustom,
    applyDraftColor,
    setThemeMode,
    resetToDefault,
  } = useStyleThemeSettings();

  if (!hydrated) {
    return <p className="text-sm text-slate-500">Loading display settings…</p>;
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Theme</p>
        <div className={`grid gap-2 ${compact ? 'grid-cols-3' : 'grid-cols-3'}`}>
          {([
            { id: 'light' as const, label: 'Light', icon: Sun },
            { id: 'dark' as const, label: 'Dark', icon: Moon },
            { id: 'system' as const, label: 'System', icon: Monitor },
          ]).map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setThemeMode(option.id)}
                className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition ${
                  theme === option.id
                    ? 'border-blue-300 bg-blue-50 text-blue-800'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Icon className="h-4 w-4" />
                {option.label}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-500">
          Dark mode deepens your chosen brand shade instead of switching to generic gray.
        </p>
      </div>

      {showBrandColors ? (
        <>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-4 flex items-center gap-2 text-slate-800">
              <Palette className="h-4 w-4" style={{ color: previewColor }} />
              <h3 className="text-sm font-semibold text-slate-950">Brand color</h3>
            </div>
            <ColorWheelPicker value={draftColor} onChange={applyDraftColor} />
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Quick shades</p>
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

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-slate-900">Live preview</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span
                className="rounded-lg px-3 py-2 text-sm font-semibold text-white"
                style={{ backgroundColor: previewColor }}
              >
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

          <button
            type="button"
            onClick={resetToDefault}
            disabled={!usingCustom}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" />
            Back to default ChemDeck blue
          </button>
        </>
      ) : (
        <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Brand color customization is available in dev mode. Sign in as ChemDeckDev and open Dev Dash → Settings.
        </p>
      )}
    </div>
  );
}

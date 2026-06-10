'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useThemeSettings } from '@/hooks/useThemeSettings';

export default function ThemeSettingsSection() {
  const { hydrated, theme, setThemeMode } = useThemeSettings();

  if (!hydrated) {
    return <p className="text-sm text-slate-500">Loading display settings…</p>;
  }

  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Theme</p>
      <div className="grid grid-cols-3 gap-2">
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
    </div>
  );
}

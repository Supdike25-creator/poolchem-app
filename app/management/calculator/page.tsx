'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import BackButton from '../../../components/BackButton';

type DosingUnit = 'ounces' | 'cups' | 'gallons' | 'pounds';

type CalculatorSettings = {
  chlorineStrength: number;
  poolVolumeGallons: number;
  dosingUnit: DosingUnit;
};

const defaultSettings: CalculatorSettings = {
  chlorineStrength: 12.5,
  poolVolumeGallons: 25000,
  dosingUnit: 'ounces',
};

const loadSettings = (): CalculatorSettings => {
  if (typeof window === 'undefined') {
    return defaultSettings;
  }

  try {
    const savedSettings = localStorage.getItem('chemdeck-settings');
    return savedSettings ? { ...defaultSettings, ...JSON.parse(savedSettings) } : defaultSettings;
  } catch {
    return defaultSettings;
  }
};

const formatDose = (ounces: number, unit: DosingUnit) => {
  if (ounces <= 0) {
    return '0 oz';
  }

  if (unit === 'cups') {
    return `${(ounces / 8).toFixed(1)} cups`;
  }

  if (unit === 'gallons') {
    return `${(ounces / 128).toFixed(2)} gal`;
  }

  if (unit === 'pounds') {
    return `${(ounces / 16).toFixed(1)} lb`;
  }

  return `${ounces.toFixed(1)} oz`;
};

export default function ManagementCalculatorPage() {
  const [settings, setSettings] = useState<CalculatorSettings>(loadSettings);
  const [volume, setVolume] = useState(String(settings.poolVolumeGallons));
  const [currentChlorine, setCurrentChlorine] = useState('1.0');
  const [targetChlorine, setTargetChlorine] = useState('3.0');
  const [strength, setStrength] = useState(String(settings.chlorineStrength));

  useEffect(() => {
    const syncSettings = () => {
      const nextSettings = loadSettings();
      setSettings(nextSettings);
      setVolume(String(nextSettings.poolVolumeGallons));
      setStrength(String(nextSettings.chlorineStrength));
    };

    window.addEventListener('storage', syncSettings);
    window.addEventListener('chemdeck-settings-change', syncSettings);

    return () => {
      window.removeEventListener('storage', syncSettings);
      window.removeEventListener('chemdeck-settings-change', syncSettings);
    };
  }, []);

  const result = useMemo(() => {
    const gallons = Number(volume) || 0;
    const current = Number(currentChlorine) || 0;
    const target = Number(targetChlorine) || 0;
    const chlorineStrength = Number(strength) || settings.chlorineStrength;
    const delta = Math.max(0, target - current);
    const doseOunces = delta > 0 && gallons > 0 && chlorineStrength > 0
      ? (delta * gallons * 7.5) / (chlorineStrength / 100) / 128
      : 0;

    return {
      delta,
      doseOunces,
      formattedDose: formatDose(doseOunces, settings.dosingUnit),
    };
  }, [currentChlorine, settings.chlorineStrength, settings.dosingUnit, strength, targetChlorine, volume]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Management</p>
          <h1 className="text-2xl font-bold text-slate-900">Chemical Calculator</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">Run quick chlorine dosing estimates using your saved calculator defaults.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <BackButton fallbackHref="/management/settings" label="Back" />
          <Link href="/management/settings" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Settings
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Pool Volume</span>
              <input
                type="number"
                min="500"
                step="500"
                value={volume}
                onChange={(event) => setVolume(event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Chlorine Strength (%)</span>
              <input
                type="number"
                min="1"
                step="0.1"
                value={strength}
                onChange={(event) => setStrength(event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Current Chlorine</span>
              <input
                type="number"
                min="0"
                step="0.1"
                value={currentChlorine}
                onChange={(event) => setCurrentChlorine(event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Target Chlorine</span>
              <input
                type="number"
                min="0"
                step="0.1"
                value={targetChlorine}
                onChange={(event) => setTargetChlorine(event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </label>
          </div>
        </div>

        <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Recommended Dose</p>
          <p className="mt-4 text-4xl font-bold text-blue-950">{result.formattedDose}</p>
          <p className="mt-3 text-sm text-blue-800">
            Increase needed: {result.delta.toFixed(1)} ppm. Preferred unit comes from Settings.
          </p>
          <div className="mt-5 rounded-lg border border-blue-200 bg-white p-3 text-sm text-slate-700">
            This is an estimate. Follow your facility targets and supervisor rules before adding chemicals.
          </div>
        </div>
      </div>
    </div>
  );
}

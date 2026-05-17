'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Beaker,
  Calculator,
  Clock,
  Gauge,
  LayoutDashboard,
  ShieldCheck
} from 'lucide-react';

type ChlorineType = 'liquid' | 'cal-hypo' | 'trichlor' | 'dichlor';
type DosingUnit = 'ounces' | 'cups' | 'gallons' | 'pounds';

type CalculatorSettings = {
  chlorineType: ChlorineType;
  chlorineStrength: number;
  poolVolumeGallons: number;
  dosingUnit: DosingUnit;
  babyPoolSafety: boolean;
  requireApproval: boolean;
  retestReminder: number;
};

const defaultSettings: CalculatorSettings = {
  chlorineType: 'liquid',
  chlorineStrength: 12.5,
  poolVolumeGallons: 25000,
  dosingUnit: 'ounces',
  babyPoolSafety: true,
  requireApproval: true,
  retestReminder: 30,
};

const chlorineTypeOptions: Array<{ value: ChlorineType; label: string; defaultStrength: number }> = [
  { value: 'liquid', label: 'Liquid Chlorine', defaultStrength: 12.5 },
  { value: 'cal-hypo', label: 'Cal-Hypo', defaultStrength: 65 },
  { value: 'trichlor', label: 'Trichlor', defaultStrength: 90 },
  { value: 'dichlor', label: 'Dichlor', defaultStrength: 56 },
];

const dosingUnitOptions: Array<{ value: DosingUnit; label: string }> = [
  { value: 'ounces', label: 'Ounces' },
  { value: 'cups', label: 'Cups' },
  { value: 'gallons', label: 'Gallons' },
  { value: 'pounds', label: 'Pounds' },
];

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

const saveSettings = (settings: CalculatorSettings) => {
  let savedSettings = {};

  try {
    savedSettings = JSON.parse(localStorage.getItem('chemdeck-settings') ?? '{}');
  } catch {
    savedSettings = {};
  }

  localStorage.setItem('chemdeck-settings', JSON.stringify({ ...savedSettings, ...settings }));
  window.dispatchEvent(new Event('chemdeck-settings-change'));
};

const formatDose = (ounces: number, unit: DosingUnit) => {
  if (ounces <= 0) {
    return unit === 'gallons' ? '0.00 gal' : '0 oz';
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

const getDoseLabel = (type: ChlorineType) => {
  if (type === 'liquid') {
    return 'liquid chlorine';
  }

  if (type === 'cal-hypo') {
    return 'cal-hypo';
  }

  return type;
};

export default function DashboardCalculatorPage() {
  const [settings, setSettings] = useState<CalculatorSettings>(loadSettings);
  const [currentChlorine, setCurrentChlorine] = useState('1.0');
  const [targetChlorine, setTargetChlorine] = useState('3.0');
  const [babyPool, setBabyPool] = useState(false);

  useEffect(() => {
    const syncSettings = () => setSettings(loadSettings());

    window.addEventListener('storage', syncSettings);
    window.addEventListener('chemdeck-settings-change', syncSettings);

    return () => {
      window.removeEventListener('storage', syncSettings);
      window.removeEventListener('chemdeck-settings-change', syncSettings);
    };
  }, []);

  const updateSettings = (updates: Partial<CalculatorSettings>) => {
    const nextSettings = { ...settings, ...updates };
    setSettings(nextSettings);
    saveSettings(nextSettings);
  };

  const result = useMemo(() => {
    const gallons = Number(settings.poolVolumeGallons) || 0;
    const current = Number(currentChlorine) || 0;
    const target = Number(targetChlorine) || 0;
    const delta = Math.max(0, target - current);
    const strength = Number(settings.chlorineStrength) || defaultSettings.chlorineStrength;
    const rawDoseOunces = delta > 0 && gallons > 0 && strength > 0
      ? (delta * gallons * 7.5) / (strength / 100) / 128
      : 0;
    const safetyCapApplied = settings.babyPoolSafety && babyPool && rawDoseOunces > 32;
    const doseOunces = safetyCapApplied ? 32 : rawDoseOunces;
    const approvalRequired = settings.requireApproval && rawDoseOunces > 128;

    return {
      approvalRequired,
      delta,
      doseOunces,
      formattedDose: formatDose(doseOunces, settings.dosingUnit),
      rawDoseOunces,
      safetyCapApplied,
    };
  }, [babyPool, currentChlorine, settings, targetChlorine]);

  const chlorineLabel = getDoseLabel(settings.chlorineType);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/dashboard/settings"
            data-sound="click"
            className="mb-4 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Settings
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-blue-100 bg-blue-50">
              <Calculator className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Management</p>
              <h1 className="text-2xl font-bold text-slate-900">Chemical Calculator</h1>
            </div>
          </div>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">Calculate safe pool dosing recommendations.</p>
        </div>
        <Link
          href="/dashboard"
          data-sound="click"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
        >
          <LayoutDashboard className="h-4 w-4" />
          Dashboard
        </Link>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <Beaker className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-slate-900">Calculator Inputs</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Chlorine Type</span>
              <select
                value={settings.chlorineType}
                onChange={(event) => {
                  const chlorineType = event.target.value as ChlorineType;
                  const option = chlorineTypeOptions.find((item) => item.value === chlorineType);
                  updateSettings({
                    chlorineType,
                    chlorineStrength: option?.defaultStrength ?? settings.chlorineStrength,
                  });
                }}
                className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                {chlorineTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Chlorine Strength (%)</span>
              <input
                type="number"
                min="1"
                max="100"
                step="0.1"
                value={settings.chlorineStrength}
                onChange={(event) => updateSettings({ chlorineStrength: Number(event.target.value) || 0 })}
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Pool Volume</span>
              <input
                type="number"
                min="500"
                step="500"
                value={settings.poolVolumeGallons}
                onChange={(event) => updateSettings({ poolVolumeGallons: Number(event.target.value) || 0 })}
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Dosing Unit</span>
              <select
                value={settings.dosingUnit}
                onChange={(event) => updateSettings({ dosingUnit: event.target.value as DosingUnit })}
                className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                {dosingUnitOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
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

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <input
                type="checkbox"
                checked={settings.babyPoolSafety}
                onChange={(event) => updateSettings({ babyPoolSafety: event.target.checked })}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>
                <span className="block text-sm font-semibold text-slate-800">Baby pool safety cap</span>
                <span className="block text-xs text-slate-500">Limit baby pool doses to 32 oz.</span>
              </span>
            </label>

            <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <input
                type="checkbox"
                checked={settings.requireApproval}
                onChange={(event) => updateSettings({ requireApproval: event.target.checked })}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>
                <span className="block text-sm font-semibold text-slate-800">High-dose approval</span>
                <span className="block text-xs text-slate-500">Flag doses over 128 oz.</span>
              </span>
            </label>

            <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <input
                type="checkbox"
                checked={babyPool}
                onChange={(event) => setBabyPool(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>
                <span className="block text-sm font-semibold text-slate-800">This is a baby pool</span>
                <span className="block text-xs text-slate-500">Apply baby pool safety rules.</span>
              </span>
            </label>
          </div>

          <label className="mt-5 block">
            <span className="text-sm font-semibold text-slate-700">Retest Reminder</span>
            <div className="mt-2 flex max-w-xs items-center gap-2">
              <input
                type="number"
                min="5"
                max="120"
                step="5"
                value={settings.retestReminder}
                onChange={(event) => updateSettings({ retestReminder: Number(event.target.value) || 0 })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-500">minutes</span>
            </div>
          </label>
        </section>

        <section className="rounded-xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <Gauge className="h-5 w-5 text-blue-700" />
            <h2 className="text-lg font-semibold text-blue-950">Results</h2>
          </div>

          <div className="mt-5 rounded-xl border border-blue-200 bg-white p-4">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Recommended Dose</p>
            <p className="mt-3 text-4xl font-bold text-blue-950">{result.formattedDose}</p>
            <p className="mt-2 text-sm text-blue-800">
              Add {chlorineLabel} to increase chlorine by {result.delta.toFixed(1)} ppm.
            </p>
          </div>

          <div className="mt-4 space-y-3">
            {result.safetyCapApplied && (
              <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                <span>Baby pool safety cap applied. Raw estimate was {formatDose(result.rawDoseOunces, settings.dosingUnit)}.</span>
              </div>
            )}

            {result.approvalRequired && (
              <div className="flex gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                <span>Manager approval is required before applying this high-dose recommendation.</span>
              </div>
            )}

            <div className="flex gap-3 rounded-lg border border-blue-200 bg-white p-3 text-sm text-slate-700">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
              <span>Retest in {settings.retestReminder} minutes after chemical circulation.</span>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700">
              This is an estimate. Follow your facility targets, labels, and supervisor rules before adding chemicals.
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import BackButton from '../../../../components/BackButton';
import { PageHeader, SectionCard, buttonClass } from '../../../../components/OperationsUI';
import PoolWeeklyHoursEditor from '@/components/pools/PoolWeeklyHoursEditor';
import { useDevCompanyScope } from '@/lib/useDevCompanyScope';
import { getStoredSession } from '@/lib/appAccounts';
import { defaultPoolOperatingSchedule, type PoolOperatingSchedule } from '@/lib/poolSchedule';
import { ChevronDown, ChevronUp, Waves } from 'lucide-react';

export default function NewPoolForm() {
  const router = useRouter();
  const { companyId, query } = useDevCompanyScope();
  const poolsHref = `/management/pools${query}`;
  const [name, setName] = useState('');
  const [poolType, setPoolType] = useState('');
  const [volume, setVolume] = useState('');
  const [chlorineMin, setChlorineMin] = useState('1');
  const [chlorineMax, setChlorineMax] = useState('3');
  const [phMin, setPhMin] = useState('7.2');
  const [phMax, setPhMax] = useState('7.8');
  const [chlorineStrength, setChlorineStrength] = useState('12.5');
  const [notes, setNotes] = useState('');
  const [operatingSchedule, setOperatingSchedule] = useState<PoolOperatingSchedule>(defaultPoolOperatingSchedule());
  const [showHours, setShowHours] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!companyId && getStoredSession()?.role === 'dev') {
      setError('Select a company from Dev Dashboard before creating a pool.');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`/api/management/pools${query}`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          name,
          pool_type: poolType,
          volume_gallons: Number(volume) || null,
          target_chlorine_min: Number(chlorineMin) || 0,
          target_chlorine_max: Number(chlorineMax) || 0,
          target_ph_min: Number(phMin) || 0,
          target_ph_max: Number(phMax) || 0,
          default_chlorine_strength: Number(chlorineStrength) || null,
          notes,
          operating_schedule: operatingSchedule,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.ok) {
        setError(result?.message || 'Unable to create pool.');
        return;
      }

      router.push(poolsHref);
      router.refresh();
    } catch {
      setError('Network error while creating pool. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          eyebrow="Management"
          title="New Pool"
          description="Configure a managed pool with target chemistry ranges and dosing defaults."
          icon={<Waves className="h-4 w-4" />}
          actions={<BackButton fallbackHref={poolsHref} label="Back" />}
        />

        <SectionCard className="p-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Pool Name</label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-2 block h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="Example: Main Facility Pool"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">Pool Type</label>
              <input
                value={poolType}
                onChange={(event) => setPoolType(event.target.value)}
                className="mt-2 block h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="Chlorine, Salt, Spa"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Volume (gallons)</label>
              <input
                type="number"
                min="0"
                value={volume}
                onChange={(event) => setVolume(event.target.value)}
                className="mt-2 block h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="12000"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">Chlorine Target Min (ppm)</label>
              <input
                type="number"
                step="0.1"
                value={chlorineMin}
                onChange={(event) => setChlorineMin(event.target.value)}
                className="mt-2 block h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Chlorine Target Max (ppm)</label>
              <input
                type="number"
                step="0.1"
                value={chlorineMax}
                onChange={(event) => setChlorineMax(event.target.value)}
                className="mt-2 block h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">pH Target Min</label>
              <input
                type="number"
                step="0.1"
                value={phMin}
                onChange={(event) => setPhMin(event.target.value)}
                className="mt-2 block h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">pH Target Max</label>
              <input
                type="number"
                step="0.1"
                value={phMax}
                onChange={(event) => setPhMax(event.target.value)}
                className="mt-2 block h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">Default Chlorine Strength (%)</label>
              <input
                type="number"
                step="0.1"
                value={chlorineStrength}
                onChange={(event) => setChlorineStrength(event.target.value)}
                className="mt-2 block h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Notes</label>
              <input
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="mt-2 block w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-blue-500 focus:ring-blue-500"
                placeholder="Optional admin notes"
              />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
            <button
              type="button"
              onClick={() => setShowHours((value) => !value)}
              className="flex w-full items-center justify-between gap-3 text-left"
            >
              <div>
                <p className="text-sm font-semibold text-slate-900">Operating hours</p>
                <p className="mt-0.5 text-xs text-slate-500">Set default weekly hours. Override specific days later from the pool calendar.</p>
              </div>
              {showHours ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
            </button>
            {showHours ? (
              <div className="mt-4">
                <PoolWeeklyHoursEditor schedule={operatingSchedule} onChange={setOperatingSchedule} compact />
              </div>
            ) : null}
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => router.push(poolsHref)}
              data-sound="back"
              className={buttonClass.secondary}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              data-sound="success"
              className={buttonClass.primary}
            >
              {submitting ? 'Saving...' : 'Create Pool'}
            </button>
          </div>
        </form>
        </SectionCard>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '../../../../lib/supabaseClient';

export default function NewPoolPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [poolType, setPoolType] = useState('');
  const [volume, setVolume] = useState('');
  const [chlorineMin, setChlorineMin] = useState('1');
  const [chlorineMax, setChlorineMax] = useState('3');
  const [phMin, setPhMin] = useState('7.2');
  const [phMax, setPhMax] = useState('7.8');
  const [chlorineStrength, setChlorineStrength] = useState('12.5');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    const supabase = getSupabaseClient();
    const { error: insertError } = await supabase.from('pools').insert([
      {
        name,
        pool_type: poolType,
        volume_gallons: Number(volume) || null,
        target_chlorine_min: Number(chlorineMin) || 0,
        target_chlorine_max: Number(chlorineMax) || 0,
        target_ph_min: Number(phMin) || 0,
        target_ph_max: Number(phMax) || 0,
        default_chlorine_strength: Number(chlorineStrength) || null,
        notes,
      },
    ]);

    setSubmitting(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    router.push('/management/pools');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <p className="text-sm text-slate-500 uppercase tracking-wide">Management</p>
          <h1 className="text-3xl font-semibold text-slate-900">New Pool</h1>
          <p className="mt-2 text-slate-600">Configure a managed pool with target chemistry ranges and dosing defaults.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 rounded-3xl bg-white border border-slate-200 p-6 shadow-sm">
          <div>
            <label className="block text-sm font-medium text-slate-700">Pool Name</label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-2 block w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-blue-500 focus:ring-blue-500"
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
                className="mt-2 block w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-blue-500 focus:ring-blue-500"
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
                className="mt-2 block w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-blue-500 focus:ring-blue-500"
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
                className="mt-2 block w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Chlorine Target Max (ppm)</label>
              <input
                type="number"
                step="0.1"
                value={chlorineMax}
                onChange={(event) => setChlorineMax(event.target.value)}
                className="mt-2 block w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-blue-500 focus:ring-blue-500"
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
                className="mt-2 block w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">pH Target Max</label>
              <input
                type="number"
                step="0.1"
                value={phMax}
                onChange={(event) => setPhMax(event.target.value)}
                className="mt-2 block w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-blue-500 focus:ring-blue-500"
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
                className="mt-2 block w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-blue-500 focus:ring-blue-500"
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

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => router.push('/management/pools')}
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {submitting ? 'Saving...' : 'Create Pool'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

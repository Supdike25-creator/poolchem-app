'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '../../../../../lib/supabaseClient';
import BackButton from '../../../../../components/BackButton';

interface PoolData {
  id: string;
  name: string;
  pool_type?: string | null;
  volume_gallons?: number | null;
  target_chlorine_min?: number | null;
  target_chlorine_max?: number | null;
  target_ph_min?: number | null;
  target_ph_max?: number | null;
  default_chlorine_strength?: number | null;
  notes?: string | null;
}

export default function EditPoolPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const [pool, setPool] = useState<PoolData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [poolType, setPoolType] = useState('');
  const [volume, setVolume] = useState('');
  const [chlorineMin, setChlorineMin] = useState('');
  const [chlorineMax, setChlorineMax] = useState('');
  const [phMin, setPhMin] = useState('');
  const [phMax, setPhMax] = useState('');
  const [chlorineStrength, setChlorineStrength] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!id) {
      router.push('/management/pools');
      return;
    }

    const loadPool = async () => {
      setLoading(true);
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.from('pools').select('*').eq('id', id).single();

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      if (data) {
        setPool(data);
        setName(data.name || '');
        setPoolType(data.pool_type || '');
        setVolume(data.volume_gallons?.toString() || '');
        setChlorineMin(data.target_chlorine_min?.toString() || '');
        setChlorineMax(data.target_chlorine_max?.toString() || '');
        setPhMin(data.target_ph_min?.toString() || '');
        setPhMax(data.target_ph_max?.toString() || '');
        setChlorineStrength(data.default_chlorine_strength?.toString() || '');
        setNotes(data.notes || '');
      }

      setLoading(false);
    };

    loadPool();
  }, [id, router]);

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!id) return;

    setSaving(true);
    setError('');

    const supabase = getSupabaseClient();
    const { error: updateError } = await supabase
      .from('pools')
      .update({
        name,
        pool_type: poolType,
        volume_gallons: Number(volume) || null,
        target_chlorine_min: Number(chlorineMin) || null,
        target_chlorine_max: Number(chlorineMax) || null,
        target_ph_min: Number(phMin) || null,
        target_ph_max: Number(phMax) || null,
        default_chlorine_strength: Number(chlorineStrength) || null,
        notes,
      })
      .eq('id', id);

    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.push('/management/pools');
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
        <div className="flex items-center gap-3">
          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Management</p>
            <h1 className="text-2xl font-bold text-slate-900">Edit Pool</h1>
          </div>
        </div>
        <p className="mt-2 text-sm text-slate-600">Update the pool configuration and dosing targets.</p>
        </div>
        <BackButton fallbackHref="/management/pools" label="Back" />
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-blue-200 p-8 text-center shadow-sm">
          <div className="animate-pulse">
            <div className="w-12 h-12 bg-blue-100 rounded-full mx-auto mb-4"></div>
            <p className="text-slate-600">Loading pool details...</p>
          </div>
        </div>
      ) : error ? (
        <div className="bg-red-50 rounded-2xl border border-red-200 p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-red-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <p className="font-semibold text-red-800">Error</p>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      ) : !pool ? (
        <div className="bg-white rounded-2xl border border-blue-200 p-8 text-center shadow-sm">
          <svg className="w-12 h-12 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
          <p className="text-slate-600">Pool not found.</p>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-4 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div>
            <label className="block text-sm font-semibold text-slate-700">Pool Name</label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-2 block w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-blue-500 focus:ring-blue-500 transition-colors"
              required
            />
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-slate-700">Pool Type</label>
              <input
                value={poolType}
                onChange={(event) => setPoolType(event.target.value)}
                className="mt-2 block w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-blue-500 focus:ring-blue-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700">Volume (gallons)</label>
              <input
                type="number"
                min="0"
                value={volume}
                onChange={(event) => setVolume(event.target.value)}
                className="mt-2 block w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-blue-500 focus:ring-blue-500 transition-colors"
              />
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-slate-700">Chlorine Target Min (ppm)</label>
              <input
                type="number"
                step="0.1"
                value={chlorineMin}
                onChange={(event) => setChlorineMin(event.target.value)}
                className="mt-2 block w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-blue-500 focus:ring-blue-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700">Chlorine Target Max (ppm)</label>
              <input
                type="number"
                step="0.1"
                value={chlorineMax}
                onChange={(event) => setChlorineMax(event.target.value)}
                className="mt-2 block w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-blue-500 focus:ring-blue-500 transition-colors"
              />
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-slate-700">pH Target Min</label>
              <input
                type="number"
                step="0.1"
                value={phMin}
                onChange={(event) => setPhMin(event.target.value)}
                className="mt-2 block w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-blue-500 focus:ring-blue-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700">pH Target Max</label>
              <input
                type="number"
                step="0.1"
                value={phMax}
                onChange={(event) => setPhMax(event.target.value)}
                className="mt-2 block w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-blue-500 focus:ring-blue-500 transition-colors"
              />
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-slate-700">Default Chlorine Strength (%)</label>
              <input
                type="number"
                step="0.1"
                value={chlorineStrength}
                onChange={(event) => setChlorineStrength(event.target.value)}
                className="mt-2 block w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-blue-500 focus:ring-blue-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700">Notes</label>
              <input
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="mt-2 block w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-blue-500 focus:ring-blue-500 transition-colors"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => router.push('/management/pools')}
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400 transition-colors"
            >
              {saving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

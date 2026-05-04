'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '../../../../../lib/supabaseClient';

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
      setError('Invalid pool ID. Redirecting to pools list.');
      setTimeout(() => router.push('/management/pools'), 2000);
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
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <p className="text-sm text-slate-500 uppercase tracking-wide">Management</p>
          <h1 className="text-3xl font-semibold text-slate-900">Edit Pool</h1>
          <p className="mt-2 text-slate-600">Update the pool configuration and dosing targets.</p>
        </div>

        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-slate-600">Loading pool details...</div>
        ) : error ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-red-700">{error}</div>
        ) : !pool ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-slate-600">Pool not found.</div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6 rounded-3xl bg-white border border-slate-200 p-6 shadow-sm">
            <div>
              <label className="block text-sm font-medium text-slate-700">Pool Name</label>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-2 block w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-blue-500 focus:ring-blue-500"
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
                disabled={saving}
                className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
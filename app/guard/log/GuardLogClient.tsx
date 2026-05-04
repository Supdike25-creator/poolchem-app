'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '../../../lib/supabaseClient';

interface Pool {
  id: string;
  name: string;
  pool_type?: string | null;
  volume_gallons?: number | null;
  target_chlorine_min?: number | null;
  target_chlorine_max?: number | null;
  target_ph_min?: number | null;
  target_ph_max?: number | null;
  default_chlorine_strength?: number | null;
}

const calculateChlorineDose = (pool: Pool | null, currentChlorine: number) => {
  if (!pool || pool.volume_gallons == null || !pool.default_chlorine_strength) {
    return null;
  }

  const target = pool.target_chlorine_min ?? 2;
  const delta = Math.max(0, target - currentChlorine);
  const gallons = pool.volume_gallons;
  const strength = pool.default_chlorine_strength;
  const ounces = (delta * gallons) / (strength * 0.1);
  return ounces > 0 ? ounces.toFixed(1) : '0.0';
};

const getStatusClass = (value: boolean) =>
  value ? 'text-green-700 bg-green-50 border-green-200' : 'text-slate-700 bg-slate-50 border-slate-200';

export default function GuardLogClient({ searchParams }: { searchParams: URLSearchParams }) {
  const router = useRouter();

  const [pools, setPools] = useState<Pool[]>([]);
  const [selectedPoolId, setSelectedPoolId] = useState<string>('');
  const [selectedPool, setSelectedPool] = useState<Pool | null>(null);
  const [chlorine, setChlorine] = useState('2.0');
  const [ph, setPh] = useState('7.4');
  const [notes, setNotes] = useState('');
  const [photoName, setPhotoName] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadPools = async () => {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('pools')
        .select('id,name,pool_type,volume_gallons,target_chlorine_min,target_chlorine_max,target_ph_min,target_ph_max,default_chlorine_strength')
        .order('name');

      if (error) {
        setError(error.message);
        return;
      }

      const loadedPools = data ?? [];
      setPools(loadedPools);
      const initialPoolId = searchParams.get('poolId') || loadedPools[0]?.id || '';
      setSelectedPoolId(initialPoolId);
    };

    loadPools();
  }, [searchParams]);

  useEffect(() => {
    setSelectedPool(pools.find((pool) => pool.id === selectedPoolId) ?? null);
  }, [pools, selectedPoolId]);

  const chlorineDose = useMemo(() => calculateChlorineDose(selectedPool, Number(chlorine)), [selectedPool, chlorine]);

  const isChlorineInRange = selectedPool
    ? Number(chlorine) >= (selectedPool.target_chlorine_min ?? 1) && Number(chlorine) <= (selectedPool.target_chlorine_max ?? 3)
    : true;
  const isPhInRange = selectedPool
    ? Number(ph) >= (selectedPool.target_ph_min ?? 7.2) && Number(ph) <= (selectedPool.target_ph_max ?? 7.8)
    : true;

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPhotoName(event.target.files?.[0]?.name || '');
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSaving(true);

    if (!selectedPoolId) {
      setError('Please select a pool before submitting.');
      setSaving(false);
      return;
    }

    const supabase = getSupabaseClient();
    const { error: insertError } = await supabase.from('chemical_logs').insert([
      {
        pool_id: selectedPoolId,
        free_chlorine: Number(chlorine),
        ph: Number(ph),
        notes,
      },
    ]);

    setSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    router.push(`/guard/review?poolId=${selectedPoolId}&chlorine=${chlorine}&ph=${ph}`);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm text-slate-500 uppercase tracking-wide">Guard</p>
            <h1 className="text-3xl font-semibold text-slate-900">Chemical Log</h1>
            <p className="mt-2 text-slate-600 max-w-2xl">Submit the latest chemistry values for your assigned pool.</p>
          </div>
          <button
            type="button"
            onClick={() => router.push('/guard')}
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Back to Guard Home
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <label className="block text-sm font-medium text-slate-700">Select Pool</label>
            <select
              value={selectedPoolId}
              onChange={(event) => setSelectedPoolId(event.target.value)}
              className="mt-2 block w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Choose a pool</option>
              {pools.map((pool) => (
                <option key={pool.id} value={pool.id}>
                  {pool.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">Free Chlorine (ppm)</label>
              <input
                type="number"
                step="0.1"
                value={chlorine}
                onChange={(event) => setChlorine(event.target.value)}
                className="mt-2 block w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">pH</label>
              <input
                type="number"
                step="0.1"
                value={ph}
                onChange={(event) => setPh(event.target.value)}
                className="mt-2 block w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="space-y-2 rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <h2 className="text-sm font-semibold text-slate-900">Current Pool Targets</h2>
            {selectedPool ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Chlorine</p>
                  <p className="mt-2 text-base font-semibold text-slate-900">
                    {selectedPool.target_chlorine_min?.toFixed(1) ?? '1.0'} - {selectedPool.target_chlorine_max?.toFixed(1) ?? '3.0'} ppm
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">pH</p>
                  <p className="mt-2 text-base font-semibold text-slate-900">
                    {selectedPool.target_ph_min?.toFixed(1) ?? '7.2'} - {selectedPool.target_ph_max?.toFixed(1) ?? '7.8'}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-slate-600">Choose a pool to see its managed targets.</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className={"rounded-3xl border p-4 " + getStatusClass(isChlorineInRange)}>
              <p className="text-sm font-medium text-slate-700">Chlorine Status</p>
              <p className="mt-2 text-lg font-semibold">{isChlorineInRange ? 'Within target' : 'Out of range'}</p>
            </div>
            <div className={"rounded-3xl border p-4 " + getStatusClass(isPhInRange)}>
              <p className="text-sm font-medium text-slate-700">pH Status</p>
              <p className="mt-2 text-lg font-semibold">{isPhInRange ? 'Within target' : 'Out of range'}</p>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-700">Recommended chlorine dose</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">
              {chlorineDose ? `${chlorineDose} oz` : 'Select a pool to calculate'}
            </p>
            <p className="mt-1 text-sm text-slate-500">Uses configured pool volume and chlorine strength.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Notes</label>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={4}
              className="mt-2 block w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Photo (optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="mt-2 block w-full text-sm text-slate-700"
            />
            {photoName ? <p className="mt-2 text-sm text-slate-600">Selected file: {photoName}</p> : null}
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => router.push('/guard')}
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {saving ? 'Submitting...' : 'Submit Log'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

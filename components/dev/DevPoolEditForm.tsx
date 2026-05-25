'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { AdminPoolDetail } from '@/lib/devAdmin';

export default function DevPoolEditForm({ pool }: { pool: AdminPoolDetail }) {
  const router = useRouter();
  const [name, setName] = useState(pool.name);
  const [poolType, setPoolType] = useState(pool.pool_type ?? '');
  const [volume, setVolume] = useState(pool.volume_gallons?.toString() ?? '');
  const [chlorineMin, setChlorineMin] = useState(pool.target_chlorine_min?.toString() ?? '');
  const [chlorineMax, setChlorineMax] = useState(pool.target_chlorine_max?.toString() ?? '');
  const [phMin, setPhMin] = useState(pool.target_ph_min?.toString() ?? '');
  const [phMax, setPhMax] = useState(pool.target_ph_max?.toString() ?? '');
  const [chlorineStrength, setChlorineStrength] = useState(pool.default_chlorine_strength?.toString() ?? '');
  const [notes, setNotes] = useState(pool.notes ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      const response = await fetch('/api/dev/admin', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          scope: 'pool',
          action: 'update-pool',
          id: pool.id,
          name: name.trim(),
          pool_type: poolType.trim(),
          volume_gallons: volume.trim() ? Number(volume) : null,
          target_chlorine_min: chlorineMin.trim() ? Number(chlorineMin) : null,
          target_chlorine_max: chlorineMax.trim() ? Number(chlorineMax) : null,
          target_ph_min: phMin.trim() ? Number(phMin) : null,
          target_ph_max: phMax.trim() ? Number(phMax) : null,
          default_chlorine_strength: chlorineStrength.trim() ? Number(chlorineStrength) : null,
          notes: notes.trim(),
        }),
      });

      const raw = await response.text();
      let data: { ok?: boolean; message?: string } = {};
      try {
        data = raw ? (JSON.parse(raw) as { ok?: boolean; message?: string }) : {};
      } catch {
        setError(response.ok ? 'Unexpected server response.' : `Request failed (${response.status}).`);
        return;
      }

      if (!response.ok || !data.ok) {
        setError(data.message || `Request failed (${response.status}).`);
        return;
      }

      router.push('/dev-admin/pools');
      router.refresh();
    } catch (submitError) {
      setError((submitError as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'mt-2 block h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        <p>
          Company: <strong className="text-slate-900">{pool.company_name ?? pool.company_id ?? 'Unassigned'}</strong>
        </p>
        <p className="mt-1 font-mono text-xs text-slate-500">Pool ID: {pool.id}</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">Pool Name</label>
        <input value={name} onChange={(event) => setName(event.target.value)} className={inputClass} required />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700">Pool Type</label>
          <input value={poolType} onChange={(event) => setPoolType(event.target.value)} className={inputClass} placeholder="Chlorine, Salt, Spa" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Volume (gallons)</label>
          <input type="number" min="0" value={volume} onChange={(event) => setVolume(event.target.value)} className={inputClass} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700">Chlorine Target Min (ppm)</label>
          <input type="number" step="0.1" value={chlorineMin} onChange={(event) => setChlorineMin(event.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Chlorine Target Max (ppm)</label>
          <input type="number" step="0.1" value={chlorineMax} onChange={(event) => setChlorineMax(event.target.value)} className={inputClass} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700">pH Target Min</label>
          <input type="number" step="0.1" value={phMin} onChange={(event) => setPhMin(event.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">pH Target Max</label>
          <input type="number" step="0.1" value={phMax} onChange={(event) => setPhMax(event.target.value)} className={inputClass} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700">Default Chlorine Strength (%)</label>
          <input type="number" step="0.1" value={chlorineStrength} onChange={(event) => setChlorineStrength(event.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Notes</label>
          <input value={notes} onChange={(event) => setNotes(event.target.value)} className={inputClass} />
        </div>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/dev-admin/pools" className="inline-flex h-10 items-center rounded-md border border-slate-200 px-4 text-sm font-semibold text-slate-700">
          Cancel
        </Link>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex h-10 items-center rounded-md bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Save Pool'}
        </button>
      </div>
    </form>
  );
}

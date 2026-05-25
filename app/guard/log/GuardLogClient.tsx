'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getStoredSession } from '@/lib/appAccounts';
import {
  defaultCompanySettings,
  getPhotoRequirementMessage,
  mergeCompanySettings,
} from '@/lib/companySettings';
import {
  enqueueLog,
  fileToDataUrl,
  isLikelyNetworkError,
} from '@/lib/offlineLogQueue';
import OfflineLogSync from '../../../components/OfflineLogSync';
import BackButton from '../../../components/BackButton';

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

export type GuardPool = Pool;

const getDefaultPoolVolume = () => {
  if (typeof window === 'undefined') {
    return 0;
  }

  try {
    const savedSettings = localStorage.getItem('chemdeck-settings');
    const volume = savedSettings ? Number(JSON.parse(savedSettings)?.poolVolumeGallons) : 0;
    return Number.isFinite(volume) && volume > 0 ? volume : 0;
  } catch {
    return 0;
  }
};

const calculateChlorineDose = (pool: Pool | null, currentChlorine: number, defaultPoolVolume: number) => {
  if (!pool || !pool.default_chlorine_strength) {
    return null;
  }

  const gallons = pool.volume_gallons ?? defaultPoolVolume;
  if (gallons <= 0) {
    return null;
  }

  const target = pool.target_chlorine_min ?? 2;
  const delta = Math.max(0, target - currentChlorine);
  const strength = pool.default_chlorine_strength;
  const ounces = (delta * gallons) / (strength * 0.1);
  return ounces > 0 ? ounces.toFixed(1) : '0.0';
};

const getStatusClass = (value: boolean) =>
  value ? 'text-green-700 bg-green-50 border-green-200' : 'text-slate-700 bg-slate-50 border-slate-200';

export default function GuardLogClient({ initialPools = [] }: { initialPools?: Pool[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const companyId = searchParams.get('companyId');
  const poolIdParam = searchParams.get('poolId');
  const logIdParam = searchParams.get('logId');
  const guardHomeHref = companyId ? `/worker-view?companyId=${encodeURIComponent(companyId)}` : '/guard';

  const [pools, setPools] = useState<Pool[]>(initialPools);
  const [selectedPoolId, setSelectedPoolId] = useState<string>(() => poolIdParam || initialPools[0]?.id || '');
  const [editingLogId, setEditingLogId] = useState<string | null>(logIdParam);
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null);
  const [chlorine, setChlorine] = useState('2.0');
  const [ph, setPh] = useState('7.4');
  const [notes, setNotes] = useState('');
  const [photoName, setPhotoName] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [defaultPoolVolume, setDefaultPoolVolume] = useState(getDefaultPoolVolume);
  const [companySettings, setCompanySettings] = useState(defaultCompanySettings);
  const [queuedNotice, setQueuedNotice] = useState('');

  useEffect(() => {
    const loadPools = async () => {
      const query = companyId ? `?companyId=${encodeURIComponent(companyId)}` : '';
      const response = await fetch(`/api/company-pools${query}`, { cache: 'no-store', credentials: 'same-origin' });
      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.ok) {
        if (initialPools.length === 0) {
          setError(result?.message || 'Unable to load pools.');
        }
        return;
      }

      const loadedPools = result.pools ?? [];
      setPools(loadedPools);
      setSelectedPoolId((current) => current || poolIdParam || loadedPools[0]?.id || '');
      setError('');
    };

    void loadPools();
  }, [companyId, poolIdParam, initialPools.length]);

  useEffect(() => {
    const loadSettings = async () => {
      const response = await fetch('/api/company-settings', { cache: 'no-store', credentials: 'same-origin' });
      const result = await response.json().catch(() => null);
      if (response.ok && result?.ok) {
        setCompanySettings(mergeCompanySettings(result.company?.settings));
      }
    };

    void loadSettings();
  }, []);

  useEffect(() => {
    if (!logIdParam) return;

    const loadExistingLog = async () => {
      const response = await fetch(`/api/guard-log?logId=${encodeURIComponent(logIdParam)}`, {
        cache: 'no-store',
        credentials: 'same-origin',
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.ok || !result.log) {
        setError(result?.message || 'Unable to load log for editing.');
        return;
      }

      setEditingLogId(result.log.id);
      setSelectedPoolId(result.log.pool_id);
      setChlorine(String(result.log.free_chlorine ?? ''));
      setPh(String(result.log.ph ?? ''));
      setNotes(result.log.notes ?? '');
      setExistingPhotoUrl(result.log.photo_url ?? null);
      setPhotoName(result.log.photo_url ? 'Existing photo attached' : '');
    };

    void loadExistingLog();
  }, [logIdParam]);

  const selectedPool = useMemo(
    () => pools.find((pool) => pool.id === selectedPoolId) ?? null,
    [pools, selectedPoolId]
  );

  useEffect(() => {
    const syncDefaultPoolVolume = () => setDefaultPoolVolume(getDefaultPoolVolume());

    window.addEventListener('storage', syncDefaultPoolVolume);
    window.addEventListener('chemdeck-settings-change', syncDefaultPoolVolume);

    return () => {
      window.removeEventListener('storage', syncDefaultPoolVolume);
      window.removeEventListener('chemdeck-settings-change', syncDefaultPoolVolume);
    };
  }, []);

  const chlorineDose = useMemo(
    () => calculateChlorineDose(selectedPool, Number(chlorine), defaultPoolVolume),
    [selectedPool, chlorine, defaultPoolVolume]
  );

  const isChlorineInRange = selectedPool
    ? Number(chlorine) >= (selectedPool.target_chlorine_min ?? 1) && Number(chlorine) <= (selectedPool.target_chlorine_max ?? 3)
    : true;
  const isPhInRange = selectedPool
    ? Number(ph) >= (selectedPool.target_ph_min ?? 7.2) && Number(ph) <= (selectedPool.target_ph_max ?? 7.8)
    : true;

  const photoRequirementMessage = selectedPool
    ? getPhotoRequirementMessage(
      companySettings,
      {
        freeChlorine: Number(chlorine),
        ph: Number(ph),
        poolType: selectedPool.pool_type,
        chlorineMin: selectedPool.target_chlorine_min,
        chlorineMax: selectedPool.target_chlorine_max,
        phMin: selectedPool.target_ph_min,
        phMax: selectedPool.target_ph_max,
      },
      Boolean(photoFile || existingPhotoUrl),
    )
    : null;

  const queueOfflineSubmission = async (uploadedPhotoUrl?: string | null) => {
    let photoDataUrl: string | null = null;
    if (!uploadedPhotoUrl && photoFile) {
      photoDataUrl = await fileToDataUrl(photoFile);
    }

    enqueueLog({
      pool_id: selectedPoolId,
      pool_name: selectedPool?.name,
      free_chlorine: Number(chlorine),
      ph: Number(ph),
      notes,
      photo_url: uploadedPhotoUrl ?? null,
      photo_data_url: photoDataUrl,
      log_id: editingLogId,
    });

    setQueuedNotice('Saved offline. This log will sync automatically when you reconnect.');
    setPhotoFile(null);
    setPhotoName('');
    setNotes('');
    setSaving(false);
  };

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setPhotoFile(file);
    setPhotoName(file?.name || '');
  };

  const uploadPhotoIfNeeded = async () => {
    if (!photoFile || !selectedPoolId) return null;

    const formData = new FormData();
    formData.append('file', photoFile);
    formData.append('pool_id', selectedPoolId);

    const response = await fetch('/api/upload-log-photo', {
      method: 'POST',
      body: formData,
      credentials: 'same-origin',
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.ok) {
      throw new Error(result?.message || 'Unable to upload photo.');
    }

    return result.photo_url as string;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setQueuedNotice('');
    setSaving(true);

    if (!selectedPoolId) {
      setError('Please select a pool before submitting.');
      setSaving(false);
      return;
    }

    if (photoRequirementMessage) {
      setError(photoRequirementMessage);
      setSaving(false);
      return;
    }

    const devSession = getStoredSession();
    let photoUrl: string | null = null;

    try {
      photoUrl = await uploadPhotoIfNeeded();
    } catch (uploadError) {
      if (isLikelyNetworkError(uploadError)) {
        try {
          await queueOfflineSubmission();
          return;
        } catch (queueError) {
          setSaving(false);
          setError((queueError as Error).message);
          return;
        }
      }
      setSaving(false);
      setError((uploadError as Error).message);
      return;
    }

    if (devSession?.role === 'dev') {
      const response = await fetch('/api/dev/guard-log', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          pool_id: selectedPoolId,
          companyId,
          free_chlorine: Number(chlorine),
          ph: Number(ph),
          notes,
          photo_url: photoUrl,
        }),
      });
      const raw = await response.text();
      let result: { ok?: boolean; message?: string } | null = null;
      try {
        result = raw ? JSON.parse(raw) : null;
      } catch {
        setSaving(false);
        setError(response.ok ? 'Unexpected server response.' : `Unable to submit chemistry log (${response.status}).`);
        return;
      }
      setSaving(false);

      if (!response.ok || !result?.ok) {
        setError(result?.message || 'Unable to submit chemistry log.');
        return;
      }

      router.push(`/guard/review?poolId=${selectedPoolId}&chlorine=${chlorine}&ph=${ph}${companyId ? `&companyId=${encodeURIComponent(companyId)}` : ''}`);
      return;
    }

    try {
      const response = await fetch('/api/guard-log', {
        method: editingLogId ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          ...(editingLogId ? { log_id: editingLogId } : {}),
          pool_id: selectedPoolId,
          free_chlorine: Number(chlorine),
          ph: Number(ph),
          notes,
          photo_url: photoUrl ?? existingPhotoUrl,
        }),
      });
      const raw = await response.text();
      let result: { ok?: boolean; message?: string } | null = null;
      try {
        result = raw ? JSON.parse(raw) : null;
      } catch {
        setSaving(false);
        setError(response.ok ? 'Unexpected server response.' : `Unable to submit chemistry log (${response.status}).`);
        return;
      }
      setSaving(false);

      if (!response.ok || !result?.ok) {
        setError(result?.message || 'Unable to submit chemistry log.');
        return;
      }

      router.push(`/guard/review?poolId=${selectedPoolId}&chlorine=${chlorine}&ph=${ph}${companyId ? `&companyId=${encodeURIComponent(companyId)}` : ''}`);
    } catch (submitError) {
      setSaving(false);
      if (isLikelyNetworkError(submitError)) {
        try {
          await queueOfflineSubmission(photoUrl ?? existingPhotoUrl);
          return;
        } catch (queueError) {
          setError((queueError as Error).message);
          return;
        }
      }
      setError(submitError instanceof Error ? submitError.message : 'Unable to submit chemistry log.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm text-slate-500 uppercase tracking-wide">Guard</p>
            <h1 className="text-2xl font-semibold text-slate-900">{editingLogId ? 'Edit Chemical Log' : 'Chemical Log'}</h1>
            <p className="mt-2 text-sm text-slate-600 max-w-2xl">
              {editingLogId ? 'Update a recent submission within the last 24 hours.' : 'Submit the latest chemistry values for your assigned pool.'}
            </p>
          </div>
          <BackButton fallbackHref={guardHomeHref} label="Back" />
          <button
            type="button"
            onClick={() => router.push(guardHomeHref)}
            data-sound="back"
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Back to Guard Home
          </button>
        </div>

        <OfflineLogSync />

        <form onSubmit={handleSubmit} className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <label className="block text-sm font-medium text-slate-700">Select Pool</label>
            <select
              value={selectedPoolId}
              onChange={(event) => setSelectedPoolId(event.target.value)}
              className="mt-2 block w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">{pools.length === 0 ? 'No pools found for this company' : 'Choose a pool'}</option>
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
            <label className="block text-sm font-medium text-slate-700">
              Photo {photoRequirementMessage ? '(required)' : '(optional)'}
            </label>
            {photoRequirementMessage ? (
              <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {photoRequirementMessage}
              </p>
            ) : null}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoChange}
              className="mt-2 block w-full text-sm text-slate-700"
            />
            {photoName ? <p className="mt-2 text-sm text-slate-600">Selected file: {photoName}</p> : null}
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {queuedNotice ? <p className="text-sm text-amber-700">{queuedNotice}</p> : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => router.push(guardHomeHref)}
              data-sound="back"
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              data-sound="success"
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {saving ? 'Submitting...' : editingLogId ? 'Save Changes' : 'Submit Log'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

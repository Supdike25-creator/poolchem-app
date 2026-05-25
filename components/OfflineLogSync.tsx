'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CloudOff, RefreshCw } from 'lucide-react';
import { getQueuedLogs, onOfflineQueueChange, syncQueuedLogs } from '@/lib/offlineLogQueue';

export default function OfflineLogSync() {
  const [count, setCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState('');

  const refreshCount = () => setCount(getQueuedLogs().length);

  useEffect(() => {
    refreshCount();
    return onOfflineQueueChange(refreshCount);
  }, []);

  useEffect(() => {
    if (!count || syncing) return;

    const trySync = async () => {
      if (!navigator.onLine) return;
      setSyncing(true);
      const result = await syncQueuedLogs();
      setSyncing(false);
      refreshCount();
      if (result.synced > 0) {
        setMessage(`${result.synced} offline log${result.synced === 1 ? '' : 's'} synced.`);
      } else if (result.failed > 0) {
        setMessage(result.errors[0] || 'Some offline logs could not sync yet.');
      }
    };

    void trySync();
  }, [count, syncing]);

  const handleManualSync = async () => {
    setSyncing(true);
    setMessage('');
    const result = await syncQueuedLogs();
    setSyncing(false);
    refreshCount();
    if (result.synced > 0) {
      setMessage(`${result.synced} offline log${result.synced === 1 ? '' : 's'} synced.`);
      return;
    }
    if (result.failed > 0) {
      setMessage(result.errors[0] || 'Unable to sync offline logs.');
      return;
    }
    setMessage('No offline logs waiting to sync.');
  };

  if (!count && !message) return null;

  return (
    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <CloudOff className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">
              {count > 0 ? `${count} chemistry log${count === 1 ? '' : 's'} waiting to sync` : 'Offline sync'}
            </p>
            <p className="mt-1 text-amber-800/90">
              {count > 0
                ? 'These logs were saved on your device and will upload when connection returns.'
                : message}
            </p>
            {count > 0 && message ? <p className="mt-1 text-amber-800/90">{message}</p> : null}
          </div>
        </div>
        {count > 0 ? (
          <button
            type="button"
            disabled={syncing || !navigator.onLine}
            onClick={() => void handleManualSync()}
            className="inline-flex h-9 items-center justify-center rounded-lg bg-white px-3 text-sm font-semibold text-amber-900 ring-1 ring-amber-200 hover:bg-amber-100 disabled:opacity-60"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync now'}
          </button>
        ) : null}
      </div>
      {!navigator.onLine && count > 0 ? (
        <p className="mt-2 text-xs text-amber-800/80">
          You&apos;re offline. Logs will sync automatically when you reconnect.
        </p>
      ) : null}
      {count > 0 ? (
        <p className="mt-2 text-xs text-amber-800/80">
          <Link href="/guard/review" className="font-semibold underline">
            Review recent logs
          </Link>
        </p>
      ) : null}
    </div>
  );
}

export type QueuedLogDraft = {
  id: string;
  created_at: string;
  pool_id: string;
  pool_name?: string;
  free_chlorine: number;
  ph: number;
  notes: string;
  photo_url?: string | null;
  photo_data_url?: string | null;
  log_id?: string | null;
};

const QUEUE_KEY = 'chemdeck.offline-log-queue';
const QUEUE_CHANGE_EVENT = 'chemdeck-offline-queue-change';

const readQueue = (): QueuedLogDraft[] => {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as QueuedLogDraft[]) : [];
  } catch {
    return [];
  }
};

const writeQueue = (queue: QueuedLogDraft[]) => {
  window.localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  window.dispatchEvent(new Event(QUEUE_CHANGE_EVENT));
};

export const getQueuedLogs = () => readQueue();

export const enqueueLog = (draft: Omit<QueuedLogDraft, 'id' | 'created_at'>) => {
  const entry: QueuedLogDraft = {
    ...draft,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  };
  writeQueue([...readQueue(), entry]);
  return entry;
};

export const removeQueuedLog = (id: string) => {
  writeQueue(readQueue().filter((entry) => entry.id !== id));
};

export const onOfflineQueueChange = (listener: () => void) => {
  window.addEventListener(QUEUE_CHANGE_EVENT, listener);
  window.addEventListener('online', listener);
  return () => {
    window.removeEventListener(QUEUE_CHANGE_EVENT, listener);
    window.removeEventListener('online', listener);
  };
};

const dataUrlToFile = async (dataUrl: string, filename: string) => {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], filename, { type: blob.type || 'image/jpeg' });
};

const uploadQueuedPhoto = async (poolId: string, photoDataUrl: string) => {
  const file = await dataUrlToFile(photoDataUrl, `queued-log-${Date.now()}.jpg`);
  const formData = new FormData();
  formData.append('file', file);
  formData.append('pool_id', poolId);

  const response = await fetch('/api/upload-log-photo', {
    method: 'POST',
    body: formData,
    credentials: 'same-origin',
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.ok) {
    throw new Error(result?.message || 'Unable to upload queued photo.');
  }

  return result.photo_url as string;
};

export const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Unable to read photo for offline storage.'));
    reader.readAsDataURL(file);
  });

export const isLikelyNetworkError = (error: unknown) => {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
  if (error instanceof TypeError) return true;
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return message.includes('failed to fetch') || message.includes('network');
};

export async function syncQueuedLogs() {
  const queue = readQueue();
  let synced = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const draft of queue) {
    try {
      let photoUrl: string | null = draft.photo_url ?? null;
      if (!photoUrl && draft.photo_data_url) {
        photoUrl = await uploadQueuedPhoto(draft.pool_id, draft.photo_data_url);
      }

      const response = await fetch('/api/guard-log', {
        method: draft.log_id ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          ...(draft.log_id ? { log_id: draft.log_id } : {}),
          pool_id: draft.pool_id,
          free_chlorine: draft.free_chlorine,
          ph: draft.ph,
          notes: draft.notes,
          photo_url: photoUrl,
        }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.ok) {
        throw new Error(result?.message || 'Unable to sync queued log.');
      }

      removeQueuedLog(draft.id);
      synced += 1;
    } catch (error) {
      failed += 1;
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  return { synced, failed, errors };
}

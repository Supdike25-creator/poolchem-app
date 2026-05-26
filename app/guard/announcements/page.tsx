'use client';

import { useEffect, useState } from 'react';
import { Info } from 'lucide-react';
import { EmptyState, PageHeader, SectionCard, StatusBadge } from '../../../components/OperationsUI';

type Announcement = {
  id: string;
  title: string;
  message: string;
  priority: 'normal' | 'important' | 'emergency';
  author_name?: string;
  created_at: string;
  unread?: boolean;
};

const priorityTone = (priority: Announcement['priority']) => {
  if (priority === 'emergency') return 'critical';
  if (priority === 'important') return 'warning';
  return 'info';
};

export default function GuardAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      const response = await fetch('/api/announcements', { cache: 'no-store', credentials: 'same-origin' });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.ok) {
        setError(result?.message || 'Unable to load announcements.');
        setLoading(false);
        return;
      }
      setAnnouncements(result.announcements ?? []);
      setLoading(false);
    };

    void load();
  }, []);

  return (
    <div className="pb-24 lg:pb-8">
      <PageHeader
        eyebrow="Guard"
        title="Announcements"
        description="Company news and shift updates from your manager."
        icon={<Info className="h-4 w-4" />}
      />

      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      {loading ? (
        <p className="text-sm text-slate-500">Loading announcements...</p>
      ) : announcements.length === 0 ? (
        <EmptyState
          icon={<Info className="h-6 w-6" />}
          title="No announcements yet"
          description="Your manager has not posted any updates."
        />
      ) : (
        <div className="space-y-3">
          {announcements.map((announcement) => (
            <SectionCard key={announcement.id} className="p-5">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <StatusBadge tone={priorityTone(announcement.priority)}>{announcement.priority}</StatusBadge>
                {announcement.unread ? <StatusBadge tone="info">New</StatusBadge> : null}
              </div>
              <h2 className="text-base font-semibold text-slate-950">{announcement.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{announcement.message}</p>
              <p className="mt-3 text-xs text-slate-500">
                {announcement.author_name || 'Manager'} · {new Date(announcement.created_at).toLocaleString()}
              </p>
            </SectionCard>
          ))}
        </div>
      )}
    </div>
  );
}

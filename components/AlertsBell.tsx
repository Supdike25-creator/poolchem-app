'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';

export default function AlertsBell({ show = true }: { show?: boolean }) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!show) return;

    const loadAlerts = async () => {
      const response = await fetch('/api/alerts?unread=1&limit=20', {
        cache: 'no-store',
        credentials: 'same-origin',
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.ok) {
        setUnreadCount(0);
        return;
      }
      setUnreadCount((result.alerts ?? []).length);
    };

    void loadAlerts();
    const timer = window.setInterval(() => void loadAlerts(), 60000);
    return () => window.clearInterval(timer);
  }, [show]);

  if (!show) return null;

  return (
    <Link
      href="/management/alerts"
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
      aria-label={unreadCount > 0 ? `${unreadCount} unread alerts` : 'Alerts'}
    >
      <Bell className="h-4 w-4" />
      {unreadCount > 0 ? (
        <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      ) : null}
    </Link>
  );
}

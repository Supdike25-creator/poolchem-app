'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  PartyPopper,
  Trash2,
  Save,
} from 'lucide-react';
import { buttonClass, SectionCard } from '@/components/OperationsUI';
import PoolWeeklyHoursEditor from '@/components/pools/PoolWeeklyHoursEditor';
import {
  currentMonthValue,
  defaultPoolOperatingSchedule,
  EVENT_TYPE_HINTS,
  EVENT_TYPE_LABELS,
  formatTimeRange,
  getCalendarGrid,
  mergePoolOperatingSchedule,
  resolvePoolDayHours,
  shiftMonth,
  type PoolOperatingSchedule,
  type PoolScheduleEvent,
  type PoolScheduleEventType,
} from '@/lib/poolSchedule';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const EVENT_DEFAULTS: Record<PoolScheduleEventType, { closed: boolean; open: string; close: string }> = {
  holiday: { closed: true, open: '09:00', close: '20:00' },
  party: { closed: false, open: '09:00', close: '22:00' },
  maintenance: { closed: true, open: '09:00', close: '20:00' },
  extended: { closed: false, open: '08:00', close: '22:00' },
  custom: { closed: false, open: '09:00', close: '20:00' },
};

const eventTypeTone = (type: PoolScheduleEventType) => {
  switch (type) {
    case 'holiday':
    case 'maintenance':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'party':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'extended':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    default:
      return 'bg-amber-100 text-amber-800 border-amber-200';
  }
};

type Props = {
  poolId: string;
  poolName: string;
  query: string;
  embedded?: boolean;
};

export default function PoolScheduleEditor({ poolId, poolName, query, embedded = false }: Props) {
  const [schedule, setSchedule] = useState<PoolOperatingSchedule>(defaultPoolOperatingSchedule());
  const [events, setEvents] = useState<PoolScheduleEvent[]>([]);
  const [month, setMonth] = useState(currentMonthValue());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingWeekly, setSavingWeekly] = useState(false);
  const [savingEvent, setSavingEvent] = useState(false);

  const [eventType, setEventType] = useState<PoolScheduleEventType>('custom');
  const [eventTitle, setEventTitle] = useState('');
  const [eventClosed, setEventClosed] = useState(false);
  const [eventOpen, setEventOpen] = useState('09:00');
  const [eventClose, setEventClose] = useState('20:00');
  const [eventNotes, setEventNotes] = useState('');

  const apiBase = `/api/management/pools/${poolId}/schedule`;

  const loadMonth = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${apiBase}?month=${month}${query.replace('?', '&')}`, {
        cache: 'no-store',
        credentials: 'same-origin',
      });
      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.ok) {
        setError(result?.message || 'Unable to load schedule.');
        return;
      }

      setSchedule(mergePoolOperatingSchedule(result.pool.operating_schedule));
      setEvents(result.events ?? []);
    } catch {
      setError('Network error while loading schedule.');
    } finally {
      setLoading(false);
    }
  }, [apiBase, month, query]);

  useEffect(() => {
    void loadMonth();
  }, [loadMonth]);

  const eventsByDate = useMemo(
    () => new Map(events.map((event) => [event.event_date, event])),
    [events],
  );

  const selectedEvent = selectedDate ? eventsByDate.get(selectedDate) : undefined;
  const selectedDayHours = selectedDate
    ? resolvePoolDayHours(schedule, selectedDate, events)
    : null;

  useEffect(() => {
    if (!selectedDate) return;

    if (selectedEvent) {
      setEventType(selectedEvent.event_type);
      setEventTitle(selectedEvent.title);
      setEventClosed(selectedEvent.closed);
      setEventOpen(selectedEvent.open ?? schedule.weekly.mon.open);
      setEventClose(selectedEvent.close ?? schedule.weekly.mon.close);
      setEventNotes(selectedEvent.notes ?? '');
      return;
    }

    const weekly = resolvePoolDayHours(schedule, selectedDate, []);
    setEventType('custom');
    setEventTitle('');
    setEventClosed(false);
    setEventOpen(weekly.open);
    setEventClose(weekly.close);
    setEventNotes('');
  }, [selectedDate, selectedEvent, schedule]);

  const handleEventTypeChange = (type: PoolScheduleEventType) => {
    setEventType(type);
    const defaults = EVENT_DEFAULTS[type];
    setEventClosed(defaults.closed);
    if (!defaults.closed) {
      setEventOpen(defaults.open);
      setEventClose(defaults.close);
    }
    if (!eventTitle.trim()) {
      setEventTitle(EVENT_TYPE_LABELS[type]);
    }
  };

  const saveWeekly = async () => {
    setSavingWeekly(true);
    setError('');

    try {
      const response = await fetch(`${apiBase}${query}`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operating_schedule: schedule }),
      });
      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.ok) {
        setError(result?.message || 'Unable to save weekly hours.');
        return;
      }

      setSchedule(mergePoolOperatingSchedule(result.pool.operating_schedule));
    } catch {
      setError('Network error while saving weekly hours.');
    } finally {
      setSavingWeekly(false);
    }
  };

  const saveEvent = async () => {
    if (!selectedDate || !eventTitle.trim()) return;

    setSavingEvent(true);
    setError('');

    try {
      const response = await fetch(`${apiBase}/events${query}`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_date: selectedDate,
          event_type: eventType,
          title: eventTitle.trim(),
          closed: eventClosed,
          open: eventClosed ? null : eventOpen,
          close: eventClosed ? null : eventClose,
          notes: eventNotes.trim() || null,
        }),
      });
      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.ok) {
        setError(result?.message || 'Unable to save day override.');
        return;
      }

      setEvents((prev) => {
        const next = prev.filter((item) => item.event_date !== selectedDate);
        next.push(result.event);
        return next.sort((a, b) => a.event_date.localeCompare(b.event_date));
      });
    } catch {
      setError('Network error while saving day override.');
    } finally {
      setSavingEvent(false);
    }
  };

  const removeEvent = async () => {
    if (!selectedDate || !selectedEvent) return;

    setSavingEvent(true);
    setError('');

    try {
      const response = await fetch(`${apiBase}/events/${selectedEvent.id}${query}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.ok) {
        setError(result?.message || 'Unable to remove override.');
        return;
      }

      setEvents((prev) => prev.filter((item) => item.id !== selectedEvent.id));
    } catch {
      setError('Network error while removing override.');
    } finally {
      setSavingEvent(false);
    }
  };

  const monthLabel = useMemo(() => {
    const [year, monthNum] = month.split('-').map(Number);
    return new Date(Date.UTC(year, monthNum - 1, 1)).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });
  }, [month]);

  const calendarCells = getCalendarGrid(month);

  const daySummary = (date: string) => {
    const resolved = resolvePoolDayHours(schedule, date, events);
    if (resolved.closed) return 'Closed';
    return formatTimeRange(resolved.open, resolved.close);
  };

  const wrapperClass = embedded ? 'space-y-4' : 'space-y-5';

  return (
    <div className={wrapperClass}>
      {error ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{error}</div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <SectionCard className="p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-950">Weekly hours</h2>
              <p className="mt-1 text-sm text-slate-500">
                Default operating hours for {poolName}. Calendar overrides apply on specific dates.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void saveWeekly()}
              disabled={savingWeekly || loading}
              className={buttonClass.primary}
            >
              <Save className="mr-2 h-4 w-4" />
              {savingWeekly ? 'Saving…' : 'Save'}
            </button>
          </div>

          {loading ? (
            <p className="text-sm text-slate-500">Loading schedule…</p>
          ) : (
            <PoolWeeklyHoursEditor schedule={schedule} onChange={setSchedule} />
          )}
        </SectionCard>

        <SectionCard className="p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-slate-500" />
              <h2 className="text-base font-semibold text-slate-950">{monthLabel}</h2>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setMonth((value) => shiftMonth(value, -1))}
                className={buttonClass.secondary}
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setMonth(currentMonthValue())}
                className={buttonClass.secondary}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setMonth((value) => shiftMonth(value, 1))}
                className={buttonClass.secondary}
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mb-2 grid grid-cols-7 gap-1">
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} className="py-1 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                {label}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarCells.map((cell, index) => {
              if (!cell.date) {
                return <div key={`empty-${index}`} className="min-h-[4.5rem] rounded-lg bg-transparent" />;
              }

              const event = eventsByDate.get(cell.date);
              const isSelected = selectedDate === cell.date;
              const resolved = resolvePoolDayHours(schedule, cell.date, events);
              const dayNum = Number(cell.date.slice(-2));

              return (
                <button
                  key={cell.date}
                  type="button"
                  onClick={() => setSelectedDate(cell.date)}
                  className={`min-h-[4.5rem] rounded-lg border p-1.5 text-left transition-colors ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-sm font-semibold text-slate-900">{dayNum}</div>
                  <div className={`mt-1 text-[10px] leading-tight ${resolved.closed ? 'text-red-600' : 'text-slate-500'}`}>
                    {daySummary(cell.date)}
                  </div>
                  {event ? (
                    <div className={`mt-1 truncate rounded border px-1 py-0.5 text-[10px] font-medium ${eventTypeTone(event.event_type)}`}>
                      {event.title}
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>
        </SectionCard>
      </div>

      {selectedDate ? (
        <SectionCard className="p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-950">
                {new Date(`${selectedDate}T12:00:00`).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Weekly default:{' '}
                {selectedDayHours?.source === 'weekly' && selectedDayHours.closed
                  ? 'Closed'
                  : selectedDayHours
                    ? formatTimeRange(selectedDayHours.open, selectedDayHours.close)
                    : '—'}
                {selectedEvent ? ' · Custom override active' : ''}
              </p>
            </div>
            {selectedEvent ? (
              <button
                type="button"
                onClick={() => void removeEvent()}
                disabled={savingEvent}
                className={buttonClass.secondary}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Remove override
              </button>
            ) : null}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Event type</label>
                <select
                  value={eventType}
                  onChange={(event) => handleEventTypeChange(event.target.value as PoolScheduleEventType)}
                  className="mt-2 block h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900"
                >
                  {(Object.keys(EVENT_TYPE_LABELS) as PoolScheduleEventType[]).map((type) => (
                    <option key={type} value={type}>
                      {EVENT_TYPE_LABELS[type]}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-500">{EVENT_TYPE_HINTS[eventType]}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Title</label>
                <input
                  value={eventTitle}
                  onChange={(event) => setEventTitle(event.target.value)}
                  placeholder="Memorial Day, Pool party, filter service…"
                  className="mt-2 block h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Notes (optional)</label>
                <textarea
                  value={eventNotes}
                  onChange={(event) => setEventNotes(event.target.value)}
                  rows={2}
                  className="mt-2 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                  placeholder="Staff reminder or public-facing note"
                />
              </div>
            </div>

            <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-800">
                <input
                  type="checkbox"
                  checked={eventClosed}
                  onChange={(event) => setEventClosed(event.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                Closed all day
              </label>

              {!eventClosed ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Open</label>
                    <input
                      type="time"
                      value={eventOpen}
                      onChange={(event) => setEventOpen(event.target.value)}
                      className="mt-2 block h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Close</label>
                    <input
                      type="time"
                      value={eventClose}
                      onChange={(event) => setEventClose(event.target.value)}
                      className="mt-2 block h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                    />
                  </div>
                </div>
              ) : (
                <p className="text-sm text-red-700">Pool will show as closed on this date (holiday, maintenance, etc.).</p>
              )}

              <button
                type="button"
                onClick={() => void saveEvent()}
                disabled={savingEvent || !eventTitle.trim()}
                className={buttonClass.primary}
              >
                <PartyPopper className="mr-2 h-4 w-4" />
                {savingEvent ? 'Saving…' : selectedEvent ? 'Update day' : 'Add override'}
              </button>
            </div>
          </div>
        </SectionCard>
      ) : (
        <SectionCard className="p-5">
          <p className="text-sm text-slate-500">Select a day on the calendar to add a holiday, party, or custom hours for that date.</p>
        </SectionCard>
      )}
    </div>
  );
}

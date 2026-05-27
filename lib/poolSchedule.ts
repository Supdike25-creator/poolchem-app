import { DEFAULT_OPERATING_TIME_ZONE } from '@/lib/operatingDayBounds';

export const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type DayKey = (typeof DAY_KEYS)[number];

export const DAY_LABELS: Record<DayKey, string> = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun',
};

export type PoolDayHours = {
  closed: boolean;
  open: string;
  close: string;
};

export type PoolOperatingSchedule = {
  timezone: string;
  weekly: Record<DayKey, PoolDayHours>;
};

export type PoolScheduleEventType = 'holiday' | 'party' | 'maintenance' | 'extended' | 'custom';

export type PoolScheduleEvent = {
  id: string;
  pool_id: string;
  company_id: string;
  event_date: string;
  event_type: PoolScheduleEventType;
  title: string;
  closed: boolean;
  open: string | null;
  close: string | null;
  notes: string | null;
  created_at?: string;
};

export const EVENT_TYPE_LABELS: Record<PoolScheduleEventType, string> = {
  holiday: 'Holiday',
  party: 'Party / Event',
  maintenance: 'Maintenance',
  extended: 'Extended hours',
  custom: 'Custom',
};

export const EVENT_TYPE_HINTS: Record<PoolScheduleEventType, string> = {
  holiday: 'Pool closed or reduced hours',
  party: 'Special event — may extend hours',
  maintenance: 'Closed for service',
  extended: 'Open longer than usual',
  custom: 'One-off schedule change',
};

const defaultDay = (open = '09:00', close = '20:00', closed = false): PoolDayHours => ({
  closed,
  open,
  close,
});

export const defaultPoolOperatingSchedule = (): PoolOperatingSchedule => ({
  timezone: DEFAULT_OPERATING_TIME_ZONE,
  weekly: {
    mon: defaultDay('09:00', '20:00'),
    tue: defaultDay('09:00', '20:00'),
    wed: defaultDay('09:00', '20:00'),
    thu: defaultDay('09:00', '20:00'),
    fri: defaultDay('09:00', '20:00'),
    sat: defaultDay('10:00', '18:00'),
    sun: defaultDay('10:00', '18:00'),
  },
});

const parseTime = (value: string) => {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return hour * 60 + minute;
};

export const formatHourLabel = (hour: number) => {
  const date = new Date(Date.UTC(2026, 0, 1, hour, 0, 0));
  return date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true, timeZone: 'UTC' });
};

export const formatTimeRange = (open: string, close: string) => {
  const openMinutes = parseTime(open);
  const closeMinutes = parseTime(close);
  if (openMinutes == null || closeMinutes == null) return `${open} – ${close}`;
  const openHour = Math.floor(openMinutes / 60);
  const closeHour = Math.floor(closeMinutes / 60);
  return `${formatHourLabel(openHour)} – ${formatHourLabel(closeHour)}`;
};

export const dayKeyFromDate = (dateStr: string): DayKey => {
  const date = new Date(`${dateStr}T12:00:00`);
  const index = date.getDay();
  const map: DayKey[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  return map[index] ?? 'mon';
};

export const mergePoolOperatingSchedule = (raw: unknown): PoolOperatingSchedule => {
  const defaults = defaultPoolOperatingSchedule();
  if (!raw || typeof raw !== 'object') return defaults;

  const value = raw as Partial<PoolOperatingSchedule>;
  const weekly = { ...defaults.weekly };

  if (value.weekly && typeof value.weekly === 'object') {
    for (const key of DAY_KEYS) {
      const day = (value.weekly as Record<string, Partial<PoolDayHours>>)[key];
      if (!day) continue;
      weekly[key] = {
        closed: Boolean(day.closed),
        open: typeof day.open === 'string' ? day.open : defaults.weekly[key].open,
        close: typeof day.close === 'string' ? day.close : defaults.weekly[key].close,
      };
    }
  }

  return {
    timezone: typeof value.timezone === 'string' && value.timezone.trim() ? value.timezone : defaults.timezone,
    weekly,
  };
};

export const resolvePoolDayHours = (
  schedule: PoolOperatingSchedule,
  dateStr: string,
  events: PoolScheduleEvent[] = [],
): PoolDayHours & { source: 'event' | 'weekly'; event?: PoolScheduleEvent } => {
  const event = events.find((item) => item.event_date === dateStr);
  if (event) {
    if (event.closed) {
      return { closed: true, open: '00:00', close: '00:00', source: 'event', event };
    }
    if (event.open && event.close) {
      return { closed: false, open: event.open, close: event.close, source: 'event', event };
    }
  }

  const weekly = schedule.weekly[dayKeyFromDate(dateStr)] ?? defaultDay();
  return { ...weekly, source: 'weekly', event };
};

export const getPoolHourSlotsForDay = (dayHours: PoolDayHours) => {
  if (dayHours.closed) return [];

  const openMinutes = parseTime(dayHours.open);
  const closeMinutes = parseTime(dayHours.close);
  if (openMinutes == null || closeMinutes == null || closeMinutes <= openMinutes) return [];

  const startHour = Math.floor(openMinutes / 60);
  const endHour = Math.ceil(closeMinutes / 60);
  const slots: number[] = [];

  for (let hour = startHour; hour < endHour; hour += 1) {
    if (hour >= 0 && hour <= 23) slots.push(hour);
  }

  return slots;
};

export const getMonthDateStrings = (monthValue: string) => {
  const [year, month] = monthValue.split('-').map(Number);
  if (!year || !month) return [];

  const first = new Date(Date.UTC(year, month - 1, 1));
  const last = new Date(Date.UTC(year, month, 0));
  const dates: string[] = [];

  for (let day = 1; day <= last.getUTCDate(); day += 1) {
    dates.push(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
  }

  return dates;
};

export const getCalendarGrid = (monthValue: string) => {
  const [year, month] = monthValue.split('-').map(Number);
  if (!year || !month) return [];

  const firstDay = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: Array<{ date: string | null; inMonth: boolean }> = [];

  for (let i = 0; i < firstDay; i += 1) {
    cells.push({ date: null, inMonth: false });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({
      date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      inMonth: true,
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ date: null, inMonth: false });
  }

  return cells;
};

export const shiftMonth = (monthValue: string, delta: number) => {
  const [year, month] = monthValue.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
};

export const currentMonthValue = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

export const getUnionHourSlotsForDate = (
  pools: Array<{ id: string; operating_schedule?: unknown }>,
  events: PoolScheduleEvent[],
  dateStr: string,
  fallbackHours: number[] = [],
): number[] => {
  if (pools.length === 0) return fallbackHours;

  const slotSet = new Set<number>();

  for (const pool of pools) {
    const schedule = mergePoolOperatingSchedule(pool.operating_schedule);
    const poolEvents = events.filter((item) => item.pool_id === pool.id);
    const dayHours = resolvePoolDayHours(schedule, dateStr, poolEvents);
    getPoolHourSlotsForDay(dayHours).forEach((hour) => slotSet.add(hour));
  }

  if (slotSet.size === 0) return fallbackHours;

  return Array.from(slotSet).sort((a, b) => a - b);
};

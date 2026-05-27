'use client';

import {
  DAY_KEYS,
  DAY_LABELS,
  formatTimeRange,
  type DayKey,
  type PoolDayHours,
  type PoolOperatingSchedule,
} from '@/lib/poolSchedule';

const inputClass =
  'block h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500';

type Props = {
  schedule: PoolOperatingSchedule;
  onChange: (schedule: PoolOperatingSchedule) => void;
  compact?: boolean;
};

const updateDay = (
  schedule: PoolOperatingSchedule,
  day: DayKey,
  patch: Partial<PoolDayHours>,
): PoolOperatingSchedule => ({
  ...schedule,
  weekly: {
    ...schedule.weekly,
    [day]: { ...schedule.weekly[day], ...patch },
  },
});

export default function PoolWeeklyHoursEditor({ schedule, onChange }: Props) {
  return (
    <div className="space-y-2">
      {DAY_KEYS.map((day) => {
        const dayHours = schedule.weekly[day];
        return (
          <div
            key={day}
            className="flex flex-col gap-2 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2.5 sm:flex-row sm:items-center"
          >
            <span className="w-10 shrink-0 text-sm font-semibold text-slate-800">{DAY_LABELS[day]}</span>

            {dayHours.closed ? (
              <span className="flex-1 text-sm text-slate-500">Closed</span>
            ) : (
              <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  type="time"
                  value={dayHours.open}
                  onChange={(event) => onChange(updateDay(schedule, day, { open: event.target.value }))}
                  className={inputClass}
                  aria-label={`${DAY_LABELS[day]} open time`}
                />
                <span className="hidden text-slate-400 sm:inline">–</span>
                <input
                  type="time"
                  value={dayHours.close}
                  onChange={(event) => onChange(updateDay(schedule, day, { close: event.target.value }))}
                  className={inputClass}
                  aria-label={`${DAY_LABELS[day]} close time`}
                />
                <span className="hidden text-xs text-slate-500 lg:inline">
                  {formatTimeRange(dayHours.open, dayHours.close)}
                </span>
              </div>
            )}

            <label className="flex shrink-0 items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={dayHours.closed}
                onChange={(event) => onChange(updateDay(schedule, day, { closed: event.target.checked }))}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              Closed
            </label>
          </div>
        );
      })}
    </div>
  );
}

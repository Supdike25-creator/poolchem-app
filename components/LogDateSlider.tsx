'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';

const toDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDate = (value: string) => {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? new Date() : date;
};

const addDays = (value: string, days: number) => {
  const date = parseDate(value);
  date.setDate(date.getDate() + days);
  return toDateInputValue(date);
};

const getPresetDate = (offset: number) => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return toDateInputValue(date);
};

const formatSelectedDate = (value: string) => {
  return parseDate(value).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export default function LogDateSlider({ selectedDate }: { selectedDate: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateDate = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('date', value);
    router.push(`/management/logs?${params.toString()}`);
  };

  const presets = [
    { label: 'Yesterday', value: getPresetDate(-1) },
    { label: 'Today', value: getPresetDate(0) },
    { label: 'Tomorrow', value: getPresetDate(1) },
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Selected Day</p>
            <p className="mt-1 text-lg font-semibold tracking-tight text-slate-950">{formatSelectedDate(selectedDate)}</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-sound="click"
              onClick={() => updateDate(addDays(selectedDate, -1))}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50"
              aria-label="Previous day"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => updateDate(event.target.value)}
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              aria-label="Select log date"
            />
            <button
              type="button"
              data-sound="click"
              onClick={() => updateDate(addDays(selectedDate, 1))}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50"
              aria-label="Next day"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                data-sound="click"
                onClick={() => updateDate(preset.value)}
                className={`h-9 rounded-lg border px-3 text-sm font-semibold shadow-sm transition-colors ${
                  selectedDate === preset.value
                    ? 'border-blue-300 bg-blue-50 text-blue-800'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

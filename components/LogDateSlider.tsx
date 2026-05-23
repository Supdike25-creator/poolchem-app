'use client';

import { useRouter } from 'next/navigation';
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

const getTodayDate = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
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

  const updateDate = (value: string) => {
    router.push(`/management/logs?date=${value}`);
  };

  const todayDate = getTodayDate();

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Selected day</p>
            <p className="mt-1 text-xl font-semibold tracking-tight text-slate-950">{formatSelectedDate(selectedDate)}</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-sound="click"
              onClick={() => updateDate(addDays(selectedDate, -1))}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50"
              aria-label="Previous day"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => updateDate(event.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              aria-label="Select log date"
            />
            <button
              type="button"
              data-sound="click"
              onClick={() => updateDate(addDays(selectedDate, 1))}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50"
              aria-label="Next day"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            data-sound="click"
            onClick={() => updateDate(todayDate)}
            className={`h-10 rounded-xl border px-4 text-sm font-semibold shadow-sm transition-colors ${
              selectedDate === todayDate
                ? 'border-blue-300 bg-blue-50 text-blue-800'
                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            Today
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';

const toDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const offsetToDate = (offset: number) => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return date;
};

const dateToOffset = (value: string) => {
  const selected = new Date(`${value}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((selected.getTime() - today.getTime()) / 86_400_000);
};

export default function LogDateSlider({ selectedDate }: { selectedDate: string }) {
  const router = useRouter();
  const selectedOffset = useMemo(() => Math.max(-30, Math.min(0, dateToOffset(selectedDate))), [selectedDate]);
  const label = new Date(`${selectedDate}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const updateDate = (offset: number) => {
    router.push(`/management/logs?date=${toDateInputValue(offsetToDate(offset))}`);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Selected Day</p>
          <p className="mt-1 text-lg font-bold text-slate-900">{label}</p>
        </div>
        <button
          type="button"
          data-sound="click"
          onClick={() => updateDate(0)}
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
        >
          Today
        </button>
      </div>
      <input
        type="range"
        min="-30"
        max="0"
        step="1"
        value={selectedOffset}
        onChange={(event) => updateDate(Number(event.target.value))}
        className="mt-4 w-full accent-blue-600"
        aria-label="Select log date"
      />
      <div className="mt-2 flex justify-between text-xs text-slate-500">
        <span>30 days ago</span>
        <span>Today</span>
      </div>
    </div>
  );
}

'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Download, Filter, Search } from 'lucide-react';

type ManagementLogFiltersProps = {
  selectedDate: string;
  submitterOptions: Array<{ id: string; label: string }>;
};

export default function ManagementLogFilters({ selectedDate, submitterOptions }: ManagementLogFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const q = searchParams.get('q') ?? '';
  const status = searchParams.get('status') ?? '';
  const logger = searchParams.get('logger') ?? '';
  const photo = searchParams.get('photo') ?? '';

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    if (!params.get('date')) {
      params.set('date', selectedDate);
    }
    router.push(`/management/logs?${params.toString()}`);
  };

  const exportHref = `/api/management/logs/export?${new URLSearchParams({
    date: selectedDate,
    ...(q ? { q } : {}),
    ...(status ? { status } : {}),
    ...(logger ? { logger } : {}),
    ...(photo ? { photo } : {}),
  }).toString()}`;

  return (
    <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr_1fr_auto]">
      <label className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <span className="sr-only">Search by pool name</span>
        <input
          type="search"
          value={q}
          onChange={(event) => updateParam('q', event.target.value)}
          placeholder="Search by pool name"
          className="h-10 w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      </label>
      <select
        value={status}
        onChange={(event) => updateParam('status', event.target.value)}
        className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      >
        <option value="">All statuses</option>
        <option value="in-range">In range</option>
        <option value="review">Needs review</option>
        <option value="legacy">Legacy / missing values</option>
      </select>
      <select
        value={logger}
        onChange={(event) => updateParam('logger', event.target.value)}
        className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      >
        <option value="">All loggers</option>
        {submitterOptions.map((option) => (
          <option key={option.id} value={option.id}>{option.label}</option>
        ))}
      </select>
      <select
        value={photo}
        onChange={(event) => updateParam('photo', event.target.value)}
        className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      >
        <option value="">All records</option>
        <option value="missing-photo">Missing photo</option>
      </select>
      <a
        href={exportHref}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
      >
        <Download className="h-4 w-4" />
        Export CSV
      </a>
      <div className="lg:col-span-5 flex items-center gap-2 text-xs text-slate-500">
        <Filter className="h-3.5 w-3.5" />
        Filters apply to the table below and CSV export.
      </div>
    </div>
  );
}

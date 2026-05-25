'use client';

import { useMemo, useState } from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
import { PageHeader, SectionCard, buttonClass } from '../../../components/OperationsUI';

const toDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function ManagementCompliancePage() {
  const defaultEnd = useMemo(() => toDateInputValue(new Date()), []);
  const defaultStart = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 6);
    return toDateInputValue(date);
  }, []);

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);

  const exportHref = `/api/management/compliance/export?start=${encodeURIComponent(startDate)}&end=${encodeURIComponent(endDate)}`;

  return (
    <div className="pb-24 lg:pb-8">
      <PageHeader
        eyebrow="Reporting"
        title="Compliance Report"
        description="Export pass/fail chemistry logs for health department or internal audits."
        icon={<FileSpreadsheet className="h-4 w-4" />}
      />

      <SectionCard className="p-5">
        <div className="mb-4 flex items-center gap-2 text-slate-700">
          <FileSpreadsheet className="h-5 w-5" />
          <h2 className="text-base font-semibold text-slate-950">Date range</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-slate-700">Start date</span>
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-slate-700">End date</span>
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <a href={exportHref} className={buttonClass.primary}>
            <Download className="mr-2 h-4 w-4" />
            Download CSV report
          </a>
        </div>

        <p className="mt-4 text-sm text-slate-500">
          Each row includes pool chemistry, compliance status against pool targets, logger name, and whether a verification photo was attached.
        </p>
      </SectionCard>
    </div>
  );
}

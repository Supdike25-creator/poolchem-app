import type { ReactNode } from 'react';

export type StatusTone = 'good' | 'warning' | 'critical' | 'overdue' | 'neutral' | 'info';

const toneClasses: Record<StatusTone, string> = {
  good: 'border-green-200 bg-green-50 text-green-700 dark-readable-badge-good',
  warning: 'border-amber-200 bg-amber-50 text-amber-800 dark-readable-badge-warning',
  critical: 'border-red-200 bg-red-50 text-red-700 dark-readable-badge-critical',
  overdue: 'border-orange-200 bg-orange-50 text-orange-700 dark-readable-badge-overdue',
  neutral: 'border-slate-200 bg-slate-100 text-slate-700 dark-readable-badge-neutral',
  info: 'border-blue-200 bg-blue-50 text-blue-700 dark-readable-badge-info',
};

export function SectionCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)] ${className}`}>
      {children}
    </section>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  icon,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)] sm:flex sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <div className="mb-2 flex items-center gap-2">
          {icon ? (
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 shadow-sm">
              {icon}
            </span>
          ) : null}
          {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{eyebrow}</p> : null}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{description}</p> : null}
      </div>
      {actions ? <div className="mt-4 flex flex-wrap gap-2 sm:mt-0 sm:justify-end">{actions}</div> : null}
    </div>
  );
}

export function StatusBadge({ tone = 'neutral', children }: { tone?: StatusTone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${toneClasses[tone]}`}>
      {children}
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
      {icon ? <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm ring-1 ring-slate-200">{icon}</div> : null}
      <h2 className="text-base font-semibold text-slate-950">{title}</h2>
      {description ? <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon,
  tone = 'info',
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  tone?: StatusTone;
}) {
  return (
    <SectionCard className="p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
        </div>
        {icon ? <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${toneClasses[tone]}`}>{icon}</div> : null}
      </div>
    </SectionCard>
  );
}

export const buttonClass = {
  primary: 'inline-flex h-9 items-center justify-center rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400',
  secondary: 'inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 dark-readable-secondary-button',
};

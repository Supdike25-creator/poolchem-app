'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Mail,
  Users,
  Waves,
  X,
} from 'lucide-react';

export type DemoFocus = 'pools' | 'employees';

type Step = 'intro' | 'email' | 'schedule' | 'done';

type ScheduleDemoModalProps = {
  open: boolean;
  onClose: () => void;
};

const timeSlots = [
  '9:00 AM',
  '9:30 AM',
  '10:00 AM',
  '10:30 AM',
  '11:00 AM',
  '11:30 AM',
  '12:00 PM',
  '12:30 PM',
  '1:00 PM',
  '1:30 PM',
  '2:00 PM',
  '2:30 PM',
  '3:00 PM',
  '3:30 PM',
  '4:00 PM',
  '4:30 PM',
  '5:00 PM',
];

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const formatSelectedDate = (date: Date) =>
  date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

const buildCalendarDays = (viewMonth: Date) => {
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<Date | null> = [];

  for (let i = 0; i < startOffset; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(new Date(year, month, day));

  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
};

export default function ScheduleDemoModal({ open, onClose }: ScheduleDemoModalProps) {
  const [step, setStep] = useState<Step>('intro');
  const [focus, setFocus] = useState<DemoFocus | null>(null);
  const [email, setEmail] = useState('');
  const [viewMonth, setViewMonth] = useState(() => startOfDay(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [manualSchedule, setManualSchedule] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const today = useMemo(() => startOfDay(new Date()), []);
  const calendarDays = useMemo(() => buildCalendarDays(viewMonth), [viewMonth]);
  const emailValid = emailPattern.test(email.trim());

  const scheduleReady = Boolean(
    (selectedDate && selectedTime) || manualSchedule.trim().length >= 4,
  );

  const reset = () => {
    setStep('intro');
    setFocus(null);
    setEmail('');
    setViewMonth(startOfDay(new Date()));
    setSelectedDate(null);
    setSelectedTime('');
    setManualSchedule('');
    setSubmitting(false);
    setError('');
  };

  useEffect(() => {
    if (!open) {
      reset();
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  const handleClose = () => {
    onClose();
    reset();
  };

  const submitDemo = async () => {
    if (!focus || !emailValid || !scheduleReady) return;

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/schedule-demo', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          focus,
          scheduledDate: selectedDate ? selectedDate.toISOString().slice(0, 10) : null,
          scheduledTime: selectedTime || null,
          scheduledLabel:
            selectedDate && selectedTime
              ? `${formatSelectedDate(selectedDate)} at ${selectedTime}`
              : null,
          manualSchedule: manualSchedule.trim() || null,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.message || 'Unable to schedule demo right now.');
      }

      setStep('done');
    } catch (caughtError) {
      setError((caughtError as Error).message || 'Unable to schedule demo right now.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-md"
        aria-label="Close schedule demo dialog"
        onClick={handleClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="schedule-demo-title"
        className="relative z-[201] w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_32px_80px_rgba(15,23,42,0.22)]"
      >
        <div className="border-b border-slate-200 bg-[linear-gradient(135deg,#0A1A2F,#12345c)] px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-200">Schedule a demo</p>
              <h2 id="schedule-demo-title" className="mt-1 text-xl font-semibold tracking-tight">
                {step === 'intro' && 'See ChemDeck in action'}
                {step === 'email' && 'Where should we send the invite?'}
                {step === 'schedule' && 'Pick a date and time'}
                {step === 'done' && 'You’re on the calendar'}
              </h2>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-white transition hover:bg-white/20"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="max-h-[min(70vh,640px)] overflow-y-auto px-6 py-6">
          {step === 'intro' ? (
            <div className="space-y-5">
              <p className="text-sm leading-6 text-slate-600">
                A ChemDeck demo is a live walkthrough of how your team logs chemistry, tracks pools, and stays
                inspection-ready. We tailor the session to your operation so you leave knowing exactly how ChemDeck fits
                your workflow.
              </p>
              <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                To schedule the right demo, tell us whether you’re mainly focused on{' '}
                <strong>pools and compliance</strong> or <strong>employees and team workflows</strong>.
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    setFocus('pools');
                    setStep('email');
                  }}
                  className="rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-blue-300 hover:bg-blue-50/40"
                >
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white">
                    <Waves className="h-5 w-5" />
                  </div>
                  <p className="font-semibold text-slate-950">Pools & compliance</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Logging, ranges, reports, and multi-pool visibility.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFocus('employees');
                    setStep('email');
                  }}
                  className="rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-blue-300 hover:bg-blue-50/40"
                >
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white">
                    <Users className="h-5 w-5" />
                  </div>
                  <p className="font-semibold text-slate-950">Employees & team</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Invites, roles, guard workflows, and manager oversight.
                  </p>
                </button>
              </div>
            </div>
          ) : null}

          {step === 'email' ? (
            <div className="space-y-5">
              <p className="text-sm leading-6 text-slate-600">
                We’ll send your calendar invite and demo details to this address. Use the email you check for work
                scheduling.
              </p>
              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  <Mail className="h-4 w-4" />
                  Work email
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@yourcompany.com"
                  className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  autoFocus
                />
              </label>
              {!emailValid && email.trim() ? (
                <p className="text-sm text-amber-700">Enter a valid email address to continue.</p>
              ) : null}
            </div>
          ) : null}

          {step === 'schedule' ? (
            <div className="space-y-4">
              <p className="text-sm leading-6 text-slate-600">
                Choose a slot from the calendar, or type your preferred date and time on the right if that’s easier.
              </p>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                      <CalendarDays className="h-4 w-4 text-blue-600" />
                      {viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </p>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          setViewMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))
                        }
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                        aria-label="Previous month"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setViewMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))
                        }
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                        aria-label="Next month"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label) => (
                      <span key={label}>{label}</span>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map((day, index) => {
                      if (!day) return <span key={`empty-${index}`} className="h-9" />;
                      const disabled = day < today;
                      const selected =
                        selectedDate &&
                        day.getFullYear() === selectedDate.getFullYear() &&
                        day.getMonth() === selectedDate.getMonth() &&
                        day.getDate() === selectedDate.getDate();

                      return (
                        <button
                          key={day.toISOString()}
                          type="button"
                          disabled={disabled}
                          onClick={() => setSelectedDate(day)}
                          className={`h-9 rounded-lg text-sm font-medium transition ${
                            selected
                              ? 'bg-blue-600 text-white'
                              : disabled
                                ? 'cursor-not-allowed text-slate-300'
                                : 'text-slate-700 hover:bg-blue-50'
                          }`}
                        >
                          {day.getDate()}
                        </button>
                      );
                    })}
                  </div>
                  {selectedDate ? (
                    <div className="mt-4">
                      <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        <Clock className="h-4 w-4" />
                        Time for {formatSelectedDate(selectedDate)}
                      </p>
                      <div className="grid max-h-36 grid-cols-2 gap-2 overflow-y-auto">
                        {timeSlots.map((slot) => (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => setSelectedTime(slot)}
                            className={`rounded-lg border px-2 py-2 text-xs font-semibold transition ${
                              selectedTime === slot
                                ? 'border-blue-300 bg-blue-50 text-blue-800'
                                : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {slot}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="mb-2 text-sm font-semibold text-slate-950">Prefer to type it?</p>
                  <p className="mb-3 text-xs leading-5 text-slate-500">
                    Example: “Thursday April 3 at 2:00 PM ET” or “Any weekday morning next week.”
                  </p>
                  <textarea
                    value={manualSchedule}
                    onChange={(event) => setManualSchedule(event.target.value)}
                    rows={8}
                    placeholder="Type your preferred date and time…"
                    className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>
            </div>
          ) : null}

          {step === 'done' ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <CalendarDays className="h-7 w-7" />
              </div>
              <p className="text-sm leading-6 text-slate-600">
                Thanks — we received your demo request. We’ll email <strong>{email}</strong> to confirm your session
                {focus === 'pools' ? ' focused on pools & compliance' : ' focused on employees & team workflows'}.
              </p>
            </div>
          ) : null}

          {error ? (
            <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {error}
            </p>
          ) : null}
        </div>

        {step !== 'intro' && step !== 'done' ? (
          <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-6 py-4">
            <button
              type="button"
              onClick={() => {
                setError('');
                if (step === 'email') setStep('intro');
                if (step === 'schedule') setStep('email');
              }}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Back
            </button>
            {step === 'email' ? (
              <button
                type="button"
                disabled={!emailValid}
                onClick={() => setStep('schedule')}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Continue
              </button>
            ) : null}
            {step === 'schedule' ? (
              <button
                type="button"
                disabled={!scheduleReady || submitting}
                onClick={() => void submitDemo()}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? 'Sending…' : 'Request demo'}
              </button>
            ) : null}
          </div>
        ) : null}

        {step === 'done' ? (
          <div className="border-t border-slate-200 px-6 py-4">
            <button
              type="button"
              onClick={handleClose}
              className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-blue-600 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

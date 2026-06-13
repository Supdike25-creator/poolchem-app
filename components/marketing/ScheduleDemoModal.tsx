'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Mail,
  X,
} from 'lucide-react';
import { demoTopicOptions, formatDemoTopics, type DemoTopicId } from '@/lib/demoRequests';

type Step = 'intro' | 'email' | 'schedule' | 'done';

type ScheduleDemoModalProps = {
  open: boolean;
  onClose: () => void;
};

const timeSlotOptions = [
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '12:00',
  '12:30',
  '13:00',
  '13:30',
  '14:00',
  '14:30',
  '15:00',
  '15:30',
  '16:00',
  '16:30',
  '17:00',
];

const formatTimeLabel = (value: string) => {
  if (!value) return '0:00';
  const [hourPart, minutePart] = value.split(':');
  const hour = Number(hourPart);
  const minute = Number(minutePart);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return value;
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${`${minute}`.padStart(2, '0')} ${period}`;
};

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
  const [topics, setTopics] = useState<DemoTopicId[]>([]);
  const [email, setEmail] = useState('');
  const [viewMonth, setViewMonth] = useState(() => startOfDay(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const today = useMemo(() => startOfDay(new Date()), []);
  const calendarDays = useMemo(() => buildCalendarDays(viewMonth), [viewMonth]);
  const emailValid = emailPattern.test(email.trim());
  const topicsReady = topics.length > 0;
  const scheduleReady = Boolean(selectedDate && selectedTime);

  const toggleTopic = (topicId: DemoTopicId) => {
    setTopics((current) =>
      current.includes(topicId) ? current.filter((id) => id !== topicId) : [...current, topicId],
    );
  };

  const reset = () => {
    setStep('intro');
    setTopics([]);
    setEmail('');
    setViewMonth(startOfDay(new Date()));
    setSelectedDate(null);
    setSelectedTime('');
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
    if (!topicsReady || !emailValid || !scheduleReady) return;

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/schedule-demo', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          topics,
          scheduledDate: selectedDate ? selectedDate.toISOString().slice(0, 10) : null,
          scheduledTime: selectedTime || null,
          scheduledLabel:
            selectedDate && selectedTime
              ? `${formatSelectedDate(selectedDate)} at ${formatTimeLabel(selectedTime)}`
              : null,
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
                {step === 'schedule' && 'Select your preferred time'}
                {step === 'done' && 'Request received'}
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
                A ChemDeck demo is a live walkthrough tailored to your operation — logging, compliance, team workflows,
                and day-to-day pool management. Select everything you would like us to cover.
              </p>
              <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                Choose one or more areas below so we can prepare the right session for your team.
              </div>
              <div className="space-y-2">
                {demoTopicOptions.map((topic) => {
                  const checked = topics.includes(topic.id);
                  return (
                    <label
                      key={topic.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                        checked ? 'border-blue-300 bg-blue-50/60' : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <span
                        className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                          checked ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white'
                        }`}
                      >
                        {checked ? <Check className="h-3.5 w-3.5" /> : null}
                      </span>
                      <span className="min-w-0">
                        <span className="block font-semibold text-slate-950">{topic.label}</span>
                        <span className="mt-1 block text-sm text-slate-500">{topic.description}</span>
                      </span>
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={checked}
                        onChange={() => toggleTopic(topic.id)}
                      />
                    </label>
                  );
                })}
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
                Select a date on the calendar, then choose a time from the dropdown.
              </p>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                      <CalendarDays className="h-4 w-4 text-blue-600" />
                      Calendar
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
                  <p className="mb-3 text-sm font-medium text-slate-700">
                    {viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </p>
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
                          onClick={() => {
                            setSelectedDate(day);
                            setSelectedTime('');
                          }}
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
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-950">
                    <Clock className="h-4 w-4 text-blue-600" />
                    Date & time
                  </p>
                  <div className="space-y-4">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Date</p>
                      <p className="mt-1 text-sm font-medium text-slate-900">
                        {selectedDate ? formatSelectedDate(selectedDate) : 'Select a date on the calendar'}
                      </p>
                    </div>
                    <label className="block">
                      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Time
                      </span>
                      <div className="relative">
                        <select
                          value={selectedTime}
                          onChange={(event) => setSelectedTime(event.target.value)}
                          disabled={!selectedDate}
                          className="h-12 w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 pr-10 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                        >
                          <option value="">0:00</option>
                          {timeSlotOptions.map((slot) => (
                            <option key={slot} value={slot}>
                              {formatTimeLabel(slot)}
                            </option>
                          ))}
                        </select>
                        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
                          ▾
                        </span>
                      </div>
                    </label>
                    {selectedDate && selectedTime ? (
                      <p className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                        {formatSelectedDate(selectedDate)} at {formatTimeLabel(selectedTime)}
                      </p>
                    ) : null}
                  </div>
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
                covering <strong>{formatDemoTopics(topics)}</strong>.
              </p>
            </div>
          ) : null}

          {error ? (
            <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {error}
            </p>
          ) : null}
        </div>

        {step !== 'done' ? (
          <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-6 py-4">
            {step === 'intro' ? (
              <>
                <span />
                <button
                  type="button"
                  disabled={!topicsReady}
                  onClick={() => setStep('email')}
                  className="inline-flex h-10 items-center justify-center rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Continue
                </button>
              </>
            ) : (
              <>
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
              </>
            )}
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

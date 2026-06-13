'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  ExternalLink,
  Loader2,
  Play,
  Sparkles,
  Users,
  Waves,
} from 'lucide-react';
import { onboardingWizardSteps, type WizardStepResult } from '@/lib/devOnboardingWizard';

type WizardRunResult = {
  ok?: boolean;
  message?: string;
  steps?: WizardStepResult[];
  invite_link?: string;
  test_email?: string;
};

const phaseMeta = {
  setup: { icon: Building2, color: 'text-blue-700 bg-blue-50 border-blue-200' },
  team: { icon: Users, color: 'text-violet-700 bg-violet-50 border-violet-200' },
  operations: { icon: Waves, color: 'text-cyan-700 bg-cyan-50 border-cyan-200' },
  'go-live': { icon: Sparkles, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
} as const;

function stepStatusIcon(step: WizardStepResult | undefined, manualDone: boolean) {
  if (!step) {
    return <Circle className="h-5 w-5 text-slate-300" />;
  }
  if (step.status === 'manual') {
    return manualDone ? (
      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
    ) : (
      <ClipboardCheck className="h-5 w-5 text-amber-500" />
    );
  }
  if (step.status === 'skipped') {
    return <Circle className="h-5 w-5 text-slate-400" />;
  }
  return step.ok ? (
    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
  ) : (
    <Circle className="h-5 w-5 text-red-500 fill-red-100" />
  );
}

export default function DevOnboardingWizard({
  selectedCompanyId,
  companyName,
  testRecipient,
  configReady,
  query,
  onRunComplete,
}: {
  selectedCompanyId?: string;
  companyName?: string;
  testRecipient: string;
  configReady: boolean;
  query: string;
  onRunComplete?: (result: WizardRunResult) => void;
}) {
  const [wizardEmail, setWizardEmail] = useState(testRecipient);
  const [running, setRunning] = useState(false);
  const [sendEmail, setSendEmail] = useState(false);
  const [sendNotification, setSendNotification] = useState(false);
  const [runResult, setRunResult] = useState<WizardRunResult | null>(null);
  const [manualDone, setManualDone] = useState<Record<string, boolean>>({});

  const stepResults = useMemo(() => {
    const map = new Map<string, WizardStepResult>();
    for (const step of runResult?.steps ?? []) {
      map.set(step.id, step);
    }
    return map;
  }, [runResult?.steps]);

  const phases = useMemo(() => {
    const groups = new Map<string, typeof onboardingWizardSteps>();
    for (const step of onboardingWizardSteps) {
      const list = groups.get(step.phaseLabel) ?? [];
      list.push(step);
      groups.set(step.phaseLabel, list);
    }
    return Array.from(groups.entries());
  }, []);

  const automatedTotal = onboardingWizardSteps.filter((step) => step.kind === 'auto').length;
  const automatedPassed = onboardingWizardSteps.filter((step) => {
    if (step.kind !== 'auto') return false;
    return stepResults.get(step.id)?.ok;
  }).length;

  const manualSteps = onboardingWizardSteps.filter((step) => step.kind === 'manual');
  const manualComplete = manualSteps.every((step) => manualDone[step.id]);
  const wizardComplete = runResult?.ok && manualComplete;

  useEffect(() => {
    if (testRecipient.trim()) {
      setWizardEmail(testRecipient);
    }
  }, [testRecipient]);

  const runWizard = useCallback(async () => {
    setRunning(true);
    setManualDone({});
    try {
      const response = await fetch(`/api/dev/test-lab${query}`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'run-onboarding-wizard',
          email: wizardEmail.trim() || undefined,
          sendEmail,
          sendNotification,
        }),
      });
      const data = (await response.json()) as WizardRunResult;
      setRunResult(data);
      onRunComplete?.(data);
    } catch (error) {
      const failure = { ok: false, message: (error as Error).message };
      setRunResult(failure);
      onRunComplete?.(failure);
    } finally {
      setRunning(false);
    }
  }, [onRunComplete, query, sendEmail, sendNotification, wizardEmail]);

  const toggleManual = (id: string) => {
    setManualDone((current) => ({ ...current, [id]: !current[id] }));
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-blue-50/40 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Guided run</p>
            <h3 className="mt-1 text-xl font-semibold text-slate-950">Full onboarding wizard</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Walk through the full ChemDeck onboarding path: set up the workspace, invite a team member, complete their
              first-day task, and optionally verify email alerts. Automated steps run here; account creation must happen
              in an incognito browser like a real hire.
            </p>
            {companyName ? (
              <p className="mt-3 inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">
                Company: {companyName}
              </p>
            ) : (
              <p className="mt-3 text-sm font-semibold text-amber-800">Select a company above before running the wizard.</p>
            )}
          </div>

          <div className="w-full max-w-xs rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Progress</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">
              {runResult ? automatedPassed : 0}
              <span className="text-base font-medium text-slate-500"> / {automatedTotal} automated</span>
            </p>
            {runResult ? (
              <p className={`mt-1 text-sm font-semibold ${wizardComplete ? 'text-emerald-700' : 'text-slate-600'}`}>
                {wizardComplete
                  ? 'Full run complete'
                  : manualComplete
                    ? 'Finish failed automated checks'
                    : 'Complete manual steps in incognito'}
              </p>
            ) : (
              <p className="mt-1 text-sm text-slate-500">Run the wizard to start tracking.</p>
            )}
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-slate-700">Test employee email</span>
            <input
              type="email"
              value={wizardEmail}
              onChange={(event) => setWizardEmail(event.target.value)}
              placeholder="your+employee@email.com (optional — auto-generated if empty)"
              className="h-10 w-full rounded-lg border border-slate-200 px-3"
            />
          </label>
          <p className="self-end text-xs leading-5 text-slate-500 sm:max-w-[220px]">
            Use an address you can open in incognito for the manual join step.
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <label className="inline-flex items-center gap-2 text-slate-700">
            <input
              type="checkbox"
              checked={sendEmail}
              onChange={(event) => setSendEmail(event.target.checked)}
              className="rounded border-slate-300"
            />
            Also send live invite email
          </label>
          <label className="inline-flex items-center gap-2 text-slate-700">
            <input
              type="checkbox"
              checked={sendNotification}
              onChange={(event) => setSendNotification(event.target.checked)}
              className="rounded border-slate-300"
            />
            Test manager alert email
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!selectedCompanyId || running || !configReady}
            onClick={() => void runWizard()}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {running ? 'Running wizard…' : 'Run automated checks'}
          </button>
          {runResult?.invite_link ? (
            <a
              href={runResult.invite_link}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 text-sm font-semibold text-blue-800"
            >
              <ExternalLink className="h-4 w-4" />
              Open latest invite
            </a>
          ) : null}
          <Link
            href={selectedCompanyId ? `/management/team?companyId=${encodeURIComponent(selectedCompanyId)}` : '/management/team'}
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700"
          >
            <Users className="h-4 w-4" />
            Manager team page
          </Link>
        </div>

        {!configReady ? (
          <p className="mt-3 text-sm text-amber-800">
            Server config must be green on the Overview tab before the wizard can run automated checks.
          </p>
        ) : null}
        {runResult?.message ? (
          <p className={`mt-3 text-sm font-semibold ${runResult.ok ? 'text-emerald-800' : 'text-red-800'}`}>
            {runResult.message}
          </p>
        ) : null}
      </div>

      {phases.map(([phaseLabel, steps]) => {
        const phaseKey = steps[0]?.phase ?? 'setup';
        const meta = phaseMeta[phaseKey];
        const PhaseIcon = meta.icon;

        return (
          <section key={phaseLabel} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className={`flex items-center gap-2 border-b px-4 py-3 ${meta.color}`}>
              <PhaseIcon className="h-4 w-4" />
              <h4 className="text-sm font-semibold">{phaseLabel}</h4>
            </div>
            <ol className="divide-y divide-slate-100">
              {steps.map((definition) => {
                const result = stepResults.get(definition.id);
                const isManual = definition.kind === 'manual';

                return (
                  <li key={definition.id} className="px-4 py-4">
                    <div className="flex gap-3">
                      <div className="mt-0.5 shrink-0">{stepStatusIcon(result, Boolean(manualDone[definition.id]))}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900">{definition.title}</p>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                              definition.kind === 'auto'
                                ? 'bg-slate-100 text-slate-600'
                                : definition.kind === 'manual'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {definition.kind}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-600">{definition.description}</p>
                        <p className="mt-2 text-xs leading-5 text-slate-500">
                          <span className="font-semibold text-slate-600">Tip:</span> {definition.playbookNote}
                        </p>

                        {result?.message ? (
                          <p
                            className={`mt-2 text-sm font-medium ${
                              result.ok || result.status === 'manual' || result.status === 'skipped'
                                ? 'text-slate-700'
                                : 'text-red-700'
                            }`}
                          >
                            {result.message}
                          </p>
                        ) : null}

                        {result?.link ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            <a
                              href={result.link}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex h-8 items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2.5 text-xs font-semibold text-blue-800"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              Open
                            </a>
                          </div>
                        ) : null}

                        {isManual ? (
                          <label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-800">
                            <input
                              type="checkbox"
                              checked={Boolean(manualDone[definition.id])}
                              onChange={() => toggleManual(definition.id)}
                              className="rounded border-slate-300"
                            />
                            I completed this step in the browser
                          </label>
                        ) : null}

                        {Array.isArray((result?.details as { checklist?: string[] } | undefined)?.checklist) ? (
                          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-600">
                            {((result?.details as { checklist: string[] }).checklist).map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}

      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-900">Possible product improvements</p>
        <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-600">
          <li>
            <strong>Progress persistence</strong> — Show “Onboarding 3/5” on{' '}
            <code className="text-xs">/management/dashboard</code> until the first pool, invite, and log exist.
          </li>
          <li>
            <strong>Skip & return</strong> — Let managers skip the invite step and finish later from a persistent
            “Add your first employee” banner.
          </li>
          <li>
            <strong>Copy invite link</strong> — Offer a copy-link option on the Team page for staff without reliable email.
          </li>
          <li>
            <strong>Role templates</strong> — Pre-define roles like “Head lifeguard” vs “Pool tech” with default pool
            assignments on accept.
          </li>
          <li>
            <strong>Mobile-first nudge</strong> — After the first log, prompt employees to install the PWA.
          </li>
        </ul>
      </div>
    </div>
  );
}

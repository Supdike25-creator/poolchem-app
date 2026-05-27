'use client';

import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

export default function ProfilePasscodeCell({
  passcode,
  hint,
}: {
  passcode: string | null;
  hint?: string | null;
}) {
  const [visible, setVisible] = useState(false);

  if (!passcode) {
    return (
      <span className="text-xs text-slate-400" title={hint ?? undefined}>
        {hint ?? '—'}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="min-w-[3rem] font-mono text-xs text-slate-800">
        {visible ? passcode : '••••'}
      </span>
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? 'Hide passcode' : 'Show passcode'}
        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
      >
        {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

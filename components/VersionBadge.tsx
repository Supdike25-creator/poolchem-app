import { appVersion } from '../lib/generatedVersion';

export default function VersionBadge() {
  return (
    <div className="fixed bottom-3 right-3 z-50 rounded-md border border-slate-200 bg-white/90 px-2.5 py-1 text-xs font-semibold text-slate-500 shadow-sm backdrop-blur">
      v{appVersion}
    </div>
  );
}

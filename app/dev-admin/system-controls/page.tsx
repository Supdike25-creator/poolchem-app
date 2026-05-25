import DevShell from '@/components/dev/DevShell';
import AdminActionPanel from '@/components/dev/AdminActionPanel';
import DevToolPanel from '@/components/dev/DevToolPanel';
import { readDevApiRequests, readDevRawLogs, readDevTables, readFeatureFlags } from '@/lib/devTools';
import { requireDev } from '@/lib/devAdmin';

export const dynamic = 'force-dynamic';

export default async function DevAdminSystemControlsPage() {
  await requireDev();
  const [flags, logs, requests, tables] = await Promise.all([
    readFeatureFlags(),
    readDevRawLogs(),
    readDevApiRequests(),
    readDevTables(),
  ]);

  return (
    <DevShell>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold text-slate-950">Admin Panel: System Controls</h1>
        <div className="mt-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <AdminActionPanel scope="system" />
        </div>
        <div className="mt-5">
          <DevToolPanel tables={tables} initialFlags={flags} initialLogs={logs} initialRequests={requests} />
        </div>
      </div>
    </DevShell>
  );
}

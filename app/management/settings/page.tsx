import Link from 'next/link';

export default function ManagementSettingsPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-8">
          <div>
            <p className="text-sm text-slate-500 uppercase tracking-wide">Management</p>
            <h1 className="text-3xl font-semibold text-slate-900">Settings</h1>
            <p className="mt-2 text-slate-600 max-w-2xl">Administrative settings for your team, notifications, and log rules.</p>
          </div>
          <Link href="/management/dashboard" className="inline-flex items-center justify-center rounded-lg bg-white border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Return to Dashboard
          </Link>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="text-slate-900">
            <h2 className="text-xl font-semibold">Coming soon</h2>
            <p className="mt-3 text-slate-600">
              Guard and management settings will appear here. This area is reserved for role-based permissions, notification preferences, and system-level configuration.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

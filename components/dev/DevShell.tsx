import Link from 'next/link';
import { Building2, Code2, Gauge, SlidersHorizontal, Users, Waves } from 'lucide-react';
import ChemDeckLogo from '@/components/ChemDeckLogo';
import { DevCompanyProvider } from '@/components/dev/DevCompanyContext';

const adminItems = [
  { label: 'Profiles', href: '/dev-admin/profiles', icon: Users },
  { label: 'Companies', href: '/dev-admin/companies', icon: Building2 },
  { label: 'Pools', href: '/dev-admin/pools', icon: Waves },
  { label: 'System Controls', href: '/dev-admin/system-controls', icon: SlidersHorizontal },
];

function DevNavLink({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: typeof Gauge;
}) {
  return (
    <Link
      href={href}
      className="flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-100 hover:text-slate-950"
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span className="sidebar-label truncate whitespace-nowrap">{label}</span>
    </Link>
  );
}

export default function DevShell({ children }: { children: React.ReactNode }) {
  return (
    <DevCompanyProvider>
      <div className="min-h-screen bg-slate-100 text-slate-950">
        <aside className="sidebar-rail group fixed left-0 top-0 z-30 hidden h-screen w-16 overflow-hidden border-r border-slate-200 bg-white shadow-sm transition-[width] duration-200 ease-out hover:w-64 focus-within:w-64 lg:flex">
          <div className="flex h-full w-full flex-col overflow-hidden p-3">
            <div className="mb-5 min-h-[74px]">
              <ChemDeckLogo variant="mark" className="h-10 w-10 group-hover:hidden group-focus-within:hidden" />
              <div className="sidebar-label hidden min-w-0 group-hover:block group-focus-within:block">
                <ChemDeckLogo variant="full" className="w-40" />
                <p className="mt-1 truncate text-sm font-semibold text-slate-950">Dev Console</p>
              </div>
            </div>

            <nav className="space-y-1" aria-label="Dev navigation">
              <DevNavLink href="/dev-dashboard" label="Dev Dashboard" icon={Gauge} />
              <div className="pt-4">
                <p className="sidebar-label px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Admin Panel
                </p>
                {adminItems.map((item) => (
                  <DevNavLink key={item.href} href={item.href} label={item.label} icon={item.icon} />
                ))}
              </div>
            </nav>

            <div className="sidebar-label sidebar-footer mt-auto rounded-lg border border-blue-200 bg-blue-50 p-3">
              <div className="flex items-center gap-2">
                <Code2 className="h-4 w-4 text-blue-700" />
                <p className="text-sm font-semibold text-blue-950">DEV only</p>
              </div>
              <p className="mt-1 text-xs leading-5 text-blue-900">ChemDeckDev session access.</p>
            </div>
          </div>
        </aside>

        <main className="lg:ml-16 lg:w-[calc(100%-4rem)]">
          <div className="border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <ChemDeckLogo variant="full" className="w-36" />
              <Link href="/dev-dashboard" className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
                Dev Dashboard
              </Link>
            </div>
          </div>
          {children}
        </main>
      </div>
    </DevCompanyProvider>
  );
}

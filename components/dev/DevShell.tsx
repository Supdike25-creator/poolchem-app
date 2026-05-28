import { DevCompanyProvider } from '@/components/dev/DevCompanyContext';
import DevShellSidebar from '@/components/dev/DevShellSidebar';

export default function DevShell({ children }: { children: React.ReactNode }) {
  return (
    <DevCompanyProvider>
      <div className="min-h-screen bg-slate-100 text-slate-950">
        <DevShellSidebar />
        <main className="ml-16 w-[calc(100%-4rem)]">{children}</main>
      </div>
    </DevCompanyProvider>
  );
}

import AuthShell from '@/components/AuthShell';
import Dashboard from '../dashboard/page';

export const dynamic = 'force-dynamic';

export default function BossViewPage() {
  return (
    <AuthShell role="manager">
      <Dashboard />
    </AuthShell>
  );
}

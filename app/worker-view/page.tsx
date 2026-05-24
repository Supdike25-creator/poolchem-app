import AuthShell from '@/components/AuthShell';
import GuardHomePage from '../guard/page';

export const dynamic = 'force-dynamic';

export default function WorkerViewPage() {
  return (
    <AuthShell role="guard">
      <GuardHomePage />
    </AuthShell>
  );
}

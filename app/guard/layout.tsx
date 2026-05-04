import AuthShell from '../../components/AuthShell';

export default function GuardLayout({ children }: { children: React.ReactNode }) {
  return <AuthShell role="guard">{children}</AuthShell>;
}

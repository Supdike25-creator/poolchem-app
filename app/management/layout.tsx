import AuthShell from '../../components/AuthShell';

export default function ManagementLayout({ children }: { children: React.ReactNode }) {
  return <AuthShell role="manager">{children}</AuthShell>;
}

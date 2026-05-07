import LoginClient from './LoginClient';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ role?: string; auth_action?: string }> }) {
  const params = await searchParams;
  return <LoginClient role={params?.role} authAction={params?.auth_action} />;
}

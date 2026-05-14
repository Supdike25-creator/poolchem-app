import LoginClient from './LoginClient';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; auth_action?: string; error?: string }>;
}) {
  const params = await searchParams;
  return <LoginClient role={params?.role} authAction={params?.auth_action} authError={params?.error} />;
}

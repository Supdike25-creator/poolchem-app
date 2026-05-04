import LoginClient from './LoginClient';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const params = await searchParams;
  return <LoginClient role={params?.role} />;
}

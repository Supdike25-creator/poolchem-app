import GuardLogClient from './GuardLogClient';

export default async function GuardLogPage({ searchParams }: { searchParams: Promise<{ poolId?: string; companyId?: string }> }) {
  const params = await searchParams;
  return <GuardLogClient searchParams={new URLSearchParams(params as Record<string, string>)} />;
}

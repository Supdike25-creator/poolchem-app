import GuardLogClient from './GuardLogClient';

export default function GuardLogPage({ searchParams }: { searchParams: { poolId?: string } }) {
  return <GuardLogClient searchParams={new URLSearchParams(searchParams as Record<string, string>)} />;
}

import { Suspense } from 'react';
import ChemDeckLoadingScreen from '@/components/ChemDeckLoadingScreen';
import InvitePageClient from './InvitePageClient';

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <Suspense fallback={<ChemDeckLoadingScreen message="Loading your invite…" />}>
      <InvitePageClient token={token} />
    </Suspense>
  );
}

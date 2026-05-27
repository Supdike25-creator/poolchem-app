import { Suspense } from 'react';
import InvitePageClient from './InvitePageClient';

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-[#0A1A2F] text-sm text-[#D9E1E8]/80">Loading invite...</main>}>
      <InvitePageClient token={token} />
    </Suspense>
  );
}

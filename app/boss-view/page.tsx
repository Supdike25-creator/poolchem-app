import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function BossViewPage({
  searchParams,
}: {
  searchParams?: Promise<{ companyId?: string }>;
}) {
  const params = await searchParams;
  const query = params?.companyId ? `?companyId=${encodeURIComponent(params.companyId)}` : '';
  redirect(`/manager-view${query}`);
}

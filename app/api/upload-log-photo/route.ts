import { NextRequest, NextResponse } from 'next/server';
import { resolveApiCompanyScope } from '@/lib/apiCompanyScope';
import { isUuid } from '@/lib/devCompanyScope';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const context = await resolveApiCompanyScope(request);
  if (!context.ok) return context.response;

  const { companyId, userId, accountDb } = context.scope;
  const submitterKey = userId && isUuid(userId) ? userId : 'dev-preview';

  const formData = await request.formData().catch(() => null);
  const file = formData?.get('file');
  const poolId = String(formData?.get('pool_id') ?? '').trim();
  const rawCompanyId = String(formData?.get('companyId') ?? '').trim();

  if (!(file instanceof File) || !poolId) {
    return NextResponse.json({ ok: false, message: 'Photo file and pool are required.' }, { status: 400 });
  }

  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ ok: false, message: 'Only image uploads are allowed.' }, { status: 400 });
  }

  if (file.size > 8 * 1024 * 1024) {
    return NextResponse.json({ ok: false, message: 'Photo must be 8 MB or smaller.' }, { status: 400 });
  }

  const scopedCompanyId = rawCompanyId || companyId;

  const { data: pool } = await accountDb
    .from('pools')
    .select('id, company_id')
    .eq('id', poolId)
    .maybeSingle();

  if (!pool || pool.company_id !== scopedCompanyId) {
    return NextResponse.json({ ok: false, message: 'That pool does not belong to your company.' }, { status: 403 });
  }

  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const objectPath = `${scopedCompanyId}/${poolId}/${submitterKey}-${Date.now()}.${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await accountDb.storage
    .from('log-photos')
    .upload(objectPath, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ ok: false, message: uploadError.message }, { status: 500 });
  }

  const { data: publicData } = accountDb.storage.from('log-photos').getPublicUrl(objectPath);

  return NextResponse.json({
    ok: true,
    photo_url: publicData.publicUrl,
    path: objectPath,
  });
}

export async function GET() {
  return NextResponse.json({ ok: false, message: 'Method not allowed.' }, { status: 405 });
}

import { NextRequest, NextResponse } from 'next/server';
import { assertDevRequest, defaultFeatureFlags, getAdminOrError, logDevMessage, logDevRequest, readFeatureFlags } from '@/lib/devTools';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const forbidden = assertDevRequest(request);
  if (forbidden) return forbidden;

  const body = await request.json().catch(() => null) as { key?: string; enabled?: boolean } | null;
  const key = body?.key;
  const enabled = body?.enabled;
  const knownFlag = defaultFeatureFlags.find((flag) => flag.key === key);

  if (!knownFlag || typeof enabled !== 'boolean') {
    await logDevRequest({ method: 'POST', path: '/api/dev/feature-flags', status: 400, message: 'Invalid feature flag payload.' });
    return NextResponse.json({ ok: false, message: 'Invalid feature flag payload.' }, { status: 400 });
  }

  const { supabase, error: adminError } = getAdminOrError();
  if (!supabase) {
    await logDevRequest({ method: 'POST', path: '/api/dev/feature-flags', status: 500, message: adminError ?? undefined });
    return NextResponse.json({ ok: false, message: adminError }, { status: 500 });
  }

  const { error } = await supabase
    .from('dev_feature_flags')
    .upsert({
      key: knownFlag.key,
      label: knownFlag.label,
      enabled,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'key' });

  const status = error ? 500 : 200;
  await logDevRequest({ method: 'POST', path: '/api/dev/feature-flags', status, message: error?.message });
  await logDevMessage(error ? 'error' : 'feature-flags', error ? `Feature flag update failed: ${error.message}` : `Feature flag ${knownFlag.label} set to ${enabled ? 'on' : 'off'}.`);

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status });
  }

  const flags = await readFeatureFlags();

  return NextResponse.json({
    ok: true,
    message: `${knownFlag.label} is now ${enabled ? 'on' : 'off'}.`,
    flags,
  });
}

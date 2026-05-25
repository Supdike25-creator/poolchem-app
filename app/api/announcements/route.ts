import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const managerRoles = new Set(['boss', 'manager', 'admin', 'supervisor', 'owner']);

const getContext = async () => {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { error: NextResponse.json({ ok: false, message: 'Unauthorized.' }, { status: 401 }) };
  }

  const accountDb = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : supabase;
  const { data: account } = await accountDb
    .from('users')
    .select('id, role, company_id, full_name, email')
    .eq('id', user.id)
    .maybeSingle();

  const companyId = account?.company_id ?? null;
  if (!companyId) {
    return { error: NextResponse.json({ ok: false, message: 'Join a company before viewing announcements.' }, { status: 400 }) };
  }

  return { user, account, companyId, accountDb };
};

export async function GET() {
  const context = await getContext();
  if ('error' in context && context.error) return context.error;

  const { companyId, user, accountDb } = context;
  const { data: rows, error } = await accountDb
    .from('announcements')
    .select('id, title, message, priority, audience, pool_id, created_by, send_notification, require_acknowledgment, created_at')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  const announcementIds = (rows ?? []).map((row) => row.id);
  const poolIds = Array.from(new Set((rows ?? []).map((row) => row.pool_id).filter(Boolean))) as string[];
  const authorIds = Array.from(new Set((rows ?? []).map((row) => row.created_by).filter(Boolean))) as string[];

  const [{ data: pools }, { data: authors }, { data: acks }] = await Promise.all([
    poolIds.length
      ? accountDb.from('pools').select('id, name').in('id', poolIds)
      : Promise.resolve({ data: [] }),
    authorIds.length
      ? accountDb.from('users').select('id, full_name, email').in('id', authorIds)
      : Promise.resolve({ data: [] }),
    announcementIds.length
      ? accountDb.from('announcement_acknowledgments').select('announcement_id, user_id').in('announcement_id', announcementIds)
      : Promise.resolve({ data: [] }),
  ]);

  const poolMap = new Map((pools ?? []).map((pool) => [pool.id, pool.name]));
  const authorMap = new Map(
    (authors ?? []).map((author) => [author.id, author.full_name || author.email || 'Manager']),
  );
  const ackCounts = new Map<string, number>();
  const userAcks = new Set<string>();

  for (const ack of acks ?? []) {
    ackCounts.set(ack.announcement_id, (ackCounts.get(ack.announcement_id) ?? 0) + 1);
    if (ack.user_id === user.id) userAcks.add(ack.announcement_id);
  }

  const announcements = (rows ?? []).map((row) => ({
    ...row,
    pool_name: row.pool_id ? poolMap.get(row.pool_id) ?? null : null,
    author_name: row.created_by ? authorMap.get(row.created_by) ?? 'Manager' : 'Manager',
    acknowledged_count: ackCounts.get(row.id) ?? 0,
    recipient_count: 0,
    unread: row.require_acknowledgment ? !userAcks.has(row.id) : false,
  }));

  return NextResponse.json({ ok: true, announcements });
}

export async function POST(request: NextRequest) {
  const context = await getContext();
  if ('error' in context && context.error) return context.error;

  const { user, account, companyId, accountDb } = context;
  if (!managerRoles.has(String(account?.role ?? '').toLowerCase())) {
    return NextResponse.json({ ok: false, message: 'Only managers can publish announcements.' }, { status: 403 });
  }

  const body = await request.json().catch(() => null) as {
    title?: string;
    message?: string;
    priority?: string;
    audience?: string;
    pool_id?: string | null;
    send_notification?: boolean;
    require_acknowledgment?: boolean;
  } | null;

  const title = body?.title?.trim();
  const message = body?.message?.trim();
  if (!title || !message) {
    return NextResponse.json({ ok: false, message: 'Title and message are required.' }, { status: 400 });
  }

  const { data, error } = await accountDb
    .from('announcements')
    .insert({
      company_id: companyId,
      title,
      message,
      priority: body?.priority || 'normal',
      audience: body?.audience || 'all_lifeguards',
      pool_id: body?.pool_id || null,
      created_by: user.id,
      send_notification: body?.send_notification ?? true,
      require_acknowledgment: body?.require_acknowledgment ?? false,
    })
    .select('id, title, message, priority, audience, pool_id, created_by, send_notification, require_acknowledgment, created_at')
    .single();

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    announcement: {
      ...data,
      author_name: account?.full_name || account?.email || 'Manager',
      acknowledged_count: 0,
      recipient_count: 0,
      unread: true,
    },
  }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const context = await getContext();
  if ('error' in context && context.error) return context.error;

  const { user, companyId, accountDb } = context;
  const body = await request.json().catch(() => null) as { announcement_id?: string } | null;
  const announcementId = body?.announcement_id?.trim();

  if (!announcementId) {
    return NextResponse.json({ ok: false, message: 'Announcement id is required.' }, { status: 400 });
  }

  const { data: announcement } = await accountDb
    .from('announcements')
    .select('id, company_id')
    .eq('id', announcementId)
    .maybeSingle();

  if (!announcement || announcement.company_id !== companyId) {
    return NextResponse.json({ ok: false, message: 'Announcement not found.' }, { status: 404 });
  }

  const { error } = await accountDb
    .from('announcement_acknowledgments')
    .upsert({
      announcement_id: announcementId,
      user_id: user.id,
      acknowledged_at: new Date().toISOString(),
    });

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

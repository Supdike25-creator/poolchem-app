import { NextRequest, NextResponse } from 'next/server';
import { resolveApiCompanyScope } from '@/lib/apiCompanyScope';
import { resolveManagerApiScope } from '@/lib/managerApiScope';
import { mergeCompanySettings } from '@/lib/companySettings';
import { dispatchAnnouncementNotifications } from '@/lib/notifications';
import { isValidUuid } from '@/lib/teamMembers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const context = await resolveApiCompanyScope(request);
  if (!context.ok) return context.response;

  const { companyId, userId, accountDb } = context.scope;
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
    if (userId && ack.user_id === userId) userAcks.add(ack.announcement_id);
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
  const context = await resolveManagerApiScope(request);
  if (!context.ok) return context.response;

  const { scope } = context;
  const { userId, companyId, accountDb, account } = scope;

  const body = await request.json().catch(() => null) as {
    title?: string;
    message?: string;
    priority?: string;
    audience?: string;
    pool_id?: string | null;
    send_notification?: boolean;
    require_acknowledgment?: boolean;
    companyId?: string;
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
      audience: body?.audience || 'all_employees',
      pool_id: body?.pool_id || null,
      created_by: isValidUuid(userId) ? userId : null,
      send_notification: body?.send_notification ?? true,
      require_acknowledgment: body?.require_acknowledgment ?? false,
    })
    .select('id, title, message, priority, audience, pool_id, created_by, send_notification, require_acknowledgment, created_at')
    .single();

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  const { data: company } = await accountDb
    .from('companies')
    .select('settings')
    .eq('id', companyId)
    .maybeSingle();

  const notificationResult = await dispatchAnnouncementNotifications(accountDb, {
    companyId,
    announcement: data,
    settings: mergeCompanySettings(company?.settings),
    origin: request.nextUrl.origin,
  });

  return NextResponse.json({
    ok: true,
    announcement: {
      ...data,
      author_name: account?.full_name || account?.email || 'ChemDeck Dev',
      acknowledged_count: 0,
      recipient_count: notificationResult.sent,
      unread: true,
    },
    notifications: notificationResult,
  }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const context = await resolveApiCompanyScope(request);
  if (!context.ok) return context.response;

  const { userId, companyId, accountDb } = context.scope;
  if (!userId) {
    return NextResponse.json({ ok: false, message: 'Sign in to acknowledge announcements.' }, { status: 401 });
  }

  const body = await request.json().catch(() => null) as { announcement_id?: string; companyId?: string } | null;
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
      user_id: userId,
      acknowledged_at: new Date().toISOString(),
    });

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

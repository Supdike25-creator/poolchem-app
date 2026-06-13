import { createAdminClient } from '@/lib/supabase/admin';

export type DemoTopicId = 'pools' | 'employees' | 'alerts' | 'reporting';

export const demoTopicOptions: Array<{ id: DemoTopicId; label: string; description: string }> = [
  {
    id: 'pools',
    label: 'Pools & compliance',
    description: 'Chemical logging, ranges, multi-pool visibility, and inspection readiness.',
  },
  {
    id: 'employees',
    label: 'Team & employees',
    description: 'Invites, roles, guard workflows, and manager oversight.',
  },
  {
    id: 'alerts',
    label: 'Alerts & notifications',
    description: 'Out-of-range alerts, missed tests, and daily summaries.',
  },
  {
    id: 'reporting',
    label: 'Reporting & exports',
    description: 'Compliance reports, log history, and operational exports.',
  },
];

const topicLabelMap = Object.fromEntries(demoTopicOptions.map((topic) => [topic.id, topic.label])) as Record<
  DemoTopicId,
  string
>;

export const formatDemoTopics = (topics: string[]) =>
  topics.map((topic) => topicLabelMap[topic as DemoTopicId] ?? topic).join(', ');

export type DemoRequestRecord = {
  id: string;
  email: string;
  topics: string[];
  scheduled_date: string | null;
  scheduled_time: string | null;
  scheduled_label: string | null;
  scheduling_notes: string | null;
  created_at: string;
};

export type SaveDemoRequestInput = {
  email: string;
  topics: DemoTopicId[];
  scheduledDate?: string | null;
  scheduledTime?: string | null;
  scheduledLabel?: string | null;
  schedulingNotes?: string | null;
};

export const saveDemoRequest = async (input: SaveDemoRequestInput) => {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false as const, message: 'Database not configured.' };
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('demo_requests')
      .insert({
        email: input.email,
        topics: input.topics,
        scheduled_date: input.scheduledDate ?? null,
        scheduled_time: input.scheduledTime ?? null,
        scheduled_label: input.scheduledLabel ?? null,
        scheduling_notes: input.schedulingNotes ?? null,
      })
      .select('id')
      .maybeSingle();

    if (error) {
      return { ok: false as const, message: error.message };
    }

    return { ok: true as const, id: data?.id ?? null };
  } catch (caughtError) {
    return { ok: false as const, message: (caughtError as Error).message };
  }
};

export const readDemoRequests = async (limit = 20): Promise<DemoRequestRecord[]> => {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return [];

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('demo_requests')
      .select('id, email, topics, scheduled_date, scheduled_time, scheduled_label, scheduling_notes, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) return [];
    return (data ?? []) as DemoRequestRecord[];
  } catch {
    return [];
  }
};

export const resolveRequestedTime = (request: DemoRequestRecord) =>
  request.scheduled_label || request.scheduling_notes || 'Not specified';

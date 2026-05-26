export type PoolStatus =
  | 'good'
  | 'due_soon'
  | 'overdue'
  | 'high_chlorine'
  | 'low_chlorine'
  | 'ph_low'
  | 'ph_high'
  | 'closed'
  | 'needs_retest'
  | 'no_data';

export type ChemicalLogSummary = {
  id: string;
  pool_id: string;
  submitted_by?: string | null;
  free_chlorine: number;
  ph: number;
  notes: string | null;
  photo_url: string | null;
  created_at: string;
};

export const getPoolStatus = (latestLog?: ChemicalLogSummary): PoolStatus => {
  if (!latestLog) return 'no_data';

  const testTime = new Date(latestLog.created_at);
  const minutesSinceTest = (Date.now() - testTime.getTime()) / (1000 * 60);

  if (minutesSinceTest > 60) return 'overdue';
  if (minutesSinceTest > 45) return 'due_soon';

  const chlorine = latestLog.free_chlorine;
  const ph = latestLog.ph;

  if (chlorine > 4) return 'high_chlorine';
  if (chlorine < 1) return 'low_chlorine';
  if (ph < 7.2) return 'ph_low';
  if (ph > 7.8) return 'ph_high';

  return 'good';
};

export const getStatusText = (status: PoolStatus) => {
  switch (status) {
    case 'good':
      return 'Good';
    case 'due_soon':
      return 'Due Soon';
    case 'high_chlorine':
      return 'High Chlorine';
    case 'low_chlorine':
      return 'Low Chlorine';
    case 'ph_low':
      return 'pH Low';
    case 'ph_high':
      return 'pH High';
    case 'overdue':
      return 'Overdue';
    case 'closed':
      return 'Closed';
    case 'needs_retest':
      return 'Needs Retest';
    case 'no_data':
      return 'No Data';
    default:
      return 'Unknown';
  }
};

export const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

export const formatRelativeDue = (latestLog?: ChemicalLogSummary) => {
  if (!latestLog) return 'Start today';

  const dueAt = new Date(latestLog.created_at).getTime() + 60 * 60 * 1000;
  const minutes = Math.round((dueAt - Date.now()) / (1000 * 60));

  if (minutes <= 0) return `${Math.abs(minutes)} min overdue`;
  return `Due in ${minutes} min`;
};

export const statusPriority: Record<PoolStatus, number> = {
  overdue: 0,
  high_chlorine: 1,
  low_chlorine: 1,
  ph_low: 1,
  ph_high: 1,
  due_soon: 2,
  needs_retest: 3,
  no_data: 4,
  closed: 5,
  good: 6,
};

export const urgentStatuses: PoolStatus[] = [
  'overdue',
  'high_chlorine',
  'low_chlorine',
  'ph_low',
  'ph_high',
];

export const outOfRangeStatuses: PoolStatus[] = [
  'high_chlorine',
  'low_chlorine',
  'ph_low',
  'ph_high',
];

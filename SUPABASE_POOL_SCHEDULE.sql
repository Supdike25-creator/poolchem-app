-- Pool operating hours + calendar events (run in Supabase SQL Editor)

alter table public.pools
  add column if not exists operating_schedule jsonb not null default '{}'::jsonb;

create table if not exists public.pool_schedule_events (
  id uuid primary key default gen_random_uuid(),
  pool_id uuid not null references public.pools(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  event_date date not null,
  event_type text not null default 'custom',
  title text not null,
  closed boolean not null default false,
  open_time time,
  close_time time,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pool_schedule_events_type_check check (
    lower(event_type) in ('holiday', 'party', 'maintenance', 'extended', 'custom')
  ),
  constraint pool_schedule_events_pool_date_unique unique (pool_id, event_date)
);

create index if not exists pool_schedule_events_pool_date_idx
  on public.pool_schedule_events (pool_id, event_date);

create index if not exists pool_schedule_events_company_date_idx
  on public.pool_schedule_events (company_id, event_date);

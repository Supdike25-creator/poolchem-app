-- Demo requests from the marketing site Schedule Demo flow.
-- Safe to run multiple times.

create table if not exists public.demo_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  topics text[] not null default '{}',
  scheduled_date date,
  scheduled_time text,
  scheduled_label text,
  scheduling_notes text,
  created_at timestamptz not null default now()
);

create index if not exists demo_requests_created_at_idx on public.demo_requests(created_at desc);

alter table public.demo_requests enable row level security;
-- No public RLS policies: demo_requests are written/read via the Supabase service role only.

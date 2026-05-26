-- ChemDeck dev dashboard support tables and policies.
-- Safe to run multiple times.

create table if not exists public.dev_feature_flags (
  key text primary key,
  label text not null,
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.dev_alerts (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'dev-dashboard',
  level text not null default 'info',
  message text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.dev_api_requests (
  id uuid primary key default gen_random_uuid(),
  method text not null,
  path text not null,
  status integer not null default 200,
  message text,
  created_at timestamptz not null default now()
);

create table if not exists public.dev_raw_logs (
  id uuid primary key default gen_random_uuid(),
  level text not null default 'info',
  message text not null,
  details jsonb,
  created_at timestamptz not null default now()
);

create index if not exists dev_alerts_created_at_idx on public.dev_alerts(created_at desc);
create index if not exists dev_api_requests_created_at_idx on public.dev_api_requests(created_at desc);
create index if not exists dev_raw_logs_created_at_idx on public.dev_raw_logs(created_at desc);

insert into public.dev_feature_flags (key, label, enabled)
values
  ('newLogFlow', 'New log flow', true),
  ('managerAlerts', 'Manager alerts', true),
  ('strictChemRanges', 'Strict chem ranges', false),
  ('photoReview', 'Photo review', true)
on conflict (key) do update
set label = excluded.label,
    enabled = excluded.enabled,
    updated_at = now();

alter table public.dev_feature_flags enable row level security;
alter table public.dev_alerts enable row level security;
alter table public.dev_api_requests enable row level security;
alter table public.dev_raw_logs enable row level security;

drop policy if exists "dev profile can read feature flags" on public.dev_feature_flags;
create policy "dev profile can read feature flags"
on public.dev_feature_flags
for select to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and lower(p.role) = 'dev'
  )
);

drop policy if exists "dev profile can read alerts" on public.dev_alerts;
create policy "dev profile can read alerts"
on public.dev_alerts
for select to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and lower(p.role) = 'dev'
  )
);

drop policy if exists "dev profile can read api requests" on public.dev_api_requests;
create policy "dev profile can read api requests"
on public.dev_api_requests
for select to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and lower(p.role) = 'dev'
  )
);

drop policy if exists "dev profile can read raw logs" on public.dev_raw_logs;
create policy "dev profile can read raw logs"
on public.dev_raw_logs
for select to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and lower(p.role) = 'dev'
  )
);

-- Dev dashboard company management uses the service role key in app routes.
-- Ensure companies can be updated by authenticated dev profiles when using direct client access.
drop policy if exists "dev can update companies" on public.companies;
create policy "dev can update companies"
on public.companies
for update to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and lower(p.role) = 'dev'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and lower(p.role) = 'dev'
  )
);

drop policy if exists "dev can insert companies" on public.companies;
create policy "dev can insert companies"
on public.companies
for insert to authenticated
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and lower(p.role) = 'dev'
  )
);

drop policy if exists "dev can delete companies" on public.companies;
create policy "dev can delete companies"
on public.companies
for delete to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and lower(p.role) = 'dev'
  )
);

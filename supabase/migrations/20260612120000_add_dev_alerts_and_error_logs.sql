-- Dev dashboard alerts + application error log storage
create table if not exists public.dev_alerts (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'dev-dashboard',
  level text not null default 'info',
  message text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.error_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete set null,
  message text not null,
  details jsonb,
  created_at timestamptz not null default now()
);

create index if not exists dev_alerts_created_at_idx on public.dev_alerts(created_at desc);
create index if not exists error_logs_created_at_idx on public.error_logs(created_at desc);
create index if not exists error_logs_company_id_idx on public.error_logs(company_id);

alter table public.dev_alerts enable row level security;
alter table public.error_logs enable row level security;

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

drop policy if exists "dev profile can read error logs" on public.error_logs;
create policy "dev profile can read error logs"
on public.error_logs
for select to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and lower(p.role) = 'dev'
  )
);

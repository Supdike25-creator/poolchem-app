-- =============================================================================
-- ChemDeck FIX — paste this ALONE in a NEW Supabase query tab, then Run (Cmd+A)
-- Do NOT use an old saved query. Do NOT run only the bottom lines.
-- =============================================================================

create extension if not exists pgcrypto;

-- Remove legacy tables (missing company_id)
drop table if exists public.announcement_acknowledgments cascade;
drop table if exists public.announcements cascade;
drop table if exists public.guard_pool_assignments cascade;
drop table if exists public.alerts cascade;

-- Announcements
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null,
  message text not null,
  priority text not null default 'normal',
  audience text not null default 'all_lifeguards',
  pool_id uuid references public.pools(id) on delete set null,
  created_by uuid,
  send_notification boolean not null default true,
  require_acknowledgment boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.announcement_acknowledgments (
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  user_id uuid not null,
  acknowledged_at timestamptz not null default now(),
  primary key (announcement_id, user_id)
);

-- Guard assignments
create table public.guard_pool_assignments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  guard_id uuid not null,
  pool_id uuid not null references public.pools(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  unique (guard_id, pool_id)
);

-- Alerts
create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  pool_id uuid references public.pools(id) on delete set null,
  chemical_log_id uuid references public.chemical_logs(id) on delete set null,
  severity text not null default 'warning',
  alert_type text not null,
  title text not null,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists announcements_company_id_idx on public.announcements(company_id);
create index if not exists guard_pool_assignments_company_idx on public.guard_pool_assignments(company_id);
create index if not exists alerts_company_id_idx on public.alerts(company_id);
create index if not exists alerts_unread_idx on public.alerts(company_id, read_at);

-- Must return 3 rows (one per table)
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name in ('announcements', 'alerts', 'guard_pool_assignments')
  and column_name = 'company_id'
order by table_name;

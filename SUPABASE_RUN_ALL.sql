-- =============================================================================
-- ChemDeck: RUN ENTIRE FILE (Cmd+A → Run) in Supabase SQL Editor
-- If this fails: run SUPABASE_FIX_NOW.sql first in a NEW query tab.
-- =============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. Pool admin insert fix
-- ---------------------------------------------------------------------------

create or replace function public.set_pool_company_from_current_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  current_company_id uuid;
  current_role text;
begin
  if auth.uid() is null then
    if new.company_id is null then
      raise exception 'Pool inserts require company_id when no auth session is present';
    end if;
    return new;
  end if;

  select company_id, lower(role)
  into current_company_id, current_role
  from public.profiles
  where id = auth.uid();

  if current_role = 'dev' then
    if new.company_id is null then
      raise exception 'Dev-created pools must include company_id';
    end if;
    return new;
  end if;

  if current_company_id is null then
    raise exception 'Current user is not assigned to a company';
  end if;

  if new.company_id is null then
    new.company_id := current_company_id;
  end if;

  if new.company_id <> current_company_id then
    raise exception 'Pools can only be assigned to your company';
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Chemical log dosing columns
-- ---------------------------------------------------------------------------

alter table public.chemical_logs
  add column if not exists submitted_by uuid references auth.users(id),
  add column if not exists dosing_amount numeric,
  add column if not exists dosing_unit text,
  add column if not exists dosing_chemical text,
  add column if not exists dosing_recommendation text;

create index if not exists chemical_logs_submitted_by_idx
  on public.chemical_logs(submitted_by);

-- ---------------------------------------------------------------------------
-- 3. Company settings
-- ---------------------------------------------------------------------------

alter table public.companies
  add column if not exists settings jsonb not null default '{}'::jsonb;

-- ---------------------------------------------------------------------------
-- 4. Announcements (drop legacy tables missing company_id, then recreate)
-- ---------------------------------------------------------------------------

drop table if exists public.announcement_acknowledgments cascade;
drop table if exists public.announcements cascade;

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

create index if not exists announcements_company_id_idx on public.announcements(company_id);
create index if not exists announcements_created_at_idx on public.announcements(created_at desc);

create table public.announcement_acknowledgments (
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  user_id uuid not null,
  acknowledged_at timestamptz not null default now(),
  primary key (announcement_id, user_id)
);

insert into storage.buckets (id, name, public)
values ('log-photos', 'log-photos', true)
on conflict (id) do update set public = excluded.public;

-- ---------------------------------------------------------------------------
-- 5. Guard pool assignments
-- ---------------------------------------------------------------------------

drop table if exists public.guard_pool_assignments cascade;

create table public.guard_pool_assignments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  guard_id uuid not null,
  pool_id uuid not null references public.pools(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  unique (guard_id, pool_id)
);

create index if not exists guard_pool_assignments_company_idx on public.guard_pool_assignments(company_id);
create index if not exists guard_pool_assignments_guard_idx on public.guard_pool_assignments(guard_id);
create index if not exists guard_pool_assignments_pool_idx on public.guard_pool_assignments(pool_id);

-- ---------------------------------------------------------------------------
-- 6. Production alerts
-- ---------------------------------------------------------------------------

drop table if exists public.alerts cascade;

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

create index if not exists alerts_company_id_idx on public.alerts(company_id);
create index if not exists alerts_created_at_idx on public.alerts(created_at desc);
create index if not exists alerts_unread_idx on public.alerts(company_id, read_at);

-- ---------------------------------------------------------------------------
-- 7. Dev dashboard tables
-- ---------------------------------------------------------------------------

create table if not exists public.dev_feature_flags (
  key text primary key,
  label text not null,
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
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

insert into public.dev_feature_flags (key, label, enabled)
values
  ('newLogFlow', 'New log flow', true),
  ('managerAlerts', 'Manager alerts', true),
  ('strictChemRanges', 'Strict chem ranges', false),
  ('photoReview', 'Photo review', true)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Done — verify key tables have company_id
-- ---------------------------------------------------------------------------

select table_name, column_name
from information_schema.columns
where table_schema = 'public'
  and table_name in ('announcements', 'alerts', 'guard_pool_assignments')
  and column_name = 'company_id'
order by table_name;

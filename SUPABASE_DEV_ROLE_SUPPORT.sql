-- ChemDeck DEV-only login and role-routing support.
-- App login:
--   Email: ChemDeckDev
--   Password: DEV
--   Role: dev
--   Route: /dev-dashboard

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.users (
  id uuid primary key default extensions.gen_random_uuid(),
  email text unique,
  full_name text,
  role text not null default 'worker',
  status text not null default 'active',
  route text generated always as (
    case
      when lower(role) = 'dev' then '/dev-dashboard'
      when lower(role) in ('boss', 'manager', 'admin', 'supervisor', 'owner') then '/management/dashboard'
      else '/guard'
    end
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_role_check check (
    lower(role) in ('worker', 'boss', 'dev', 'guard', 'manager', 'admin', 'supervisor', 'owner')
  )
);

alter table public.users
  add column if not exists email text,
  add column if not exists full_name text,
  add column if not exists role text not null default 'worker',
  add column if not exists status text not null default 'active',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'users_role_check'
      and conrelid = 'public.users'::regclass
  ) then
    alter table public.users
      add constraint users_role_check check (
        lower(role) in ('worker', 'boss', 'dev', 'guard', 'manager', 'admin', 'supervisor', 'owner')
      );
  end if;
end $$;

create or replace function public.normalize_app_role(p_role text)
returns text
language sql
immutable
as $$
  select case
    when lower(coalesce(p_role, 'worker')) = 'dev' then 'dev'
    when lower(coalesce(p_role, 'worker')) in ('boss', 'manager', 'admin', 'supervisor', 'owner') then 'manager'
    when lower(coalesce(p_role, 'worker')) in ('worker', 'guard', 'lifeguard', 'technician') then 'guard'
    else 'guard'
  end;
$$;

create or replace function public.route_for_role(p_role text)
returns text
language sql
immutable
as $$
  select case public.normalize_app_role(p_role)
    when 'dev' then '/dev-dashboard'
    when 'manager' then '/management/dashboard'
    else '/guard'
  end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'worker',
  status text not null default 'active',
  organization_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists role text not null default 'worker',
  add column if not exists status text not null default 'active',
  add column if not exists organization_id uuid,
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_role_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_role_check check (
        lower(role) in ('worker', 'boss', 'dev', 'guard', 'manager', 'admin', 'supervisor', 'owner')
      );
  end if;
end $$;

create table if not exists public.app_accounts (
  id uuid primary key default extensions.gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete cascade,
  name text not null,
  birthday date,
  username text not null unique,
  passcode_hash text not null,
  role text not null default 'guard',
  email text,
  provider text not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint app_accounts_role_check check (
    lower(role) in ('worker', 'boss', 'dev', 'guard', 'manager', 'admin', 'supervisor', 'owner')
  ),
  constraint app_accounts_provider_check check (provider in ('manual', 'google'))
);

alter table public.app_accounts
  add column if not exists role text not null default 'guard',
  add column if not exists email text,
  add column if not exists provider text not null default 'manual',
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'app_accounts_role_check'
      and conrelid = 'public.app_accounts'::regclass
  ) then
    alter table public.app_accounts drop constraint app_accounts_role_check;
  end if;

  alter table public.app_accounts
    add constraint app_accounts_role_check check (
      lower(role) in ('worker', 'boss', 'dev', 'guard', 'manager', 'admin', 'supervisor', 'owner')
    );
end $$;

insert into public.app_accounts (
  name,
  birthday,
  username,
  passcode_hash,
  role,
  email,
  provider
)
values (
  'ChemDeck Dev',
  '2000-01-01',
  'ChemDeckDev',
  extensions.crypt('DEV', extensions.gen_salt('bf')),
  'dev',
  'ChemDeckDev',
  'manual'
)
on conflict (username) do update set
  name = excluded.name,
  birthday = excluded.birthday,
  passcode_hash = excluded.passcode_hash,
  role = excluded.role,
  email = excluded.email,
  provider = excluded.provider,
  updated_at = now();

insert into public.users (email, full_name, role, status)
values ('ChemDeckDev', 'ChemDeck Dev', 'dev', 'active')
on conflict (email) do update set
  full_name = excluded.full_name,
  role = excluded.role,
  status = excluded.status,
  updated_at = now();

create index if not exists users_role_idx on public.users (lower(role));
create index if not exists profiles_role_idx on public.profiles (lower(role));
create index if not exists app_accounts_role_idx on public.app_accounts (lower(role));

alter table public.users enable row level security;
alter table public.profiles enable row level security;
alter table public.app_accounts enable row level security;

drop policy if exists "dev can read users" on public.users;
create policy "dev can read users"
on public.users
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and lower(p.role) = 'dev'
      and coalesce(lower(p.status), 'active') = 'active'
  )
);

create table if not exists public.dev_feature_flags (
  key text primary key,
  label text not null,
  enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.dev_alerts (
  id uuid primary key default extensions.gen_random_uuid(),
  severity text not null default 'info',
  alert_type text not null,
  title text not null,
  message text not null,
  source text not null default 'dev-dashboard',
  acknowledged boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.dev_api_requests (
  id uuid primary key default extensions.gen_random_uuid(),
  method text not null,
  path text not null,
  status integer not null,
  message text,
  created_at timestamptz not null default now()
);

create table if not exists public.dev_raw_logs (
  id uuid primary key default extensions.gen_random_uuid(),
  level text not null default 'info',
  message text not null,
  details jsonb,
  created_at timestamptz not null default now()
);

create index if not exists dev_alerts_created_at_idx on public.dev_alerts(created_at desc);
create index if not exists dev_alerts_source_idx on public.dev_alerts(source);
create index if not exists dev_api_requests_created_at_idx on public.dev_api_requests(created_at desc);
create index if not exists dev_raw_logs_created_at_idx on public.dev_raw_logs(created_at desc);

insert into public.dev_feature_flags (key, label, enabled)
values
  ('newLogFlow', 'New log flow', true),
  ('managerAlerts', 'Manager alerts', true),
  ('strictChemRanges', 'Strict chem ranges', false),
  ('photoReview', 'Photo review', true)
on conflict (key) do update set
  label = excluded.label,
  updated_at = now();

alter table public.dev_feature_flags enable row level security;
alter table public.dev_alerts enable row level security;
alter table public.dev_api_requests enable row level security;
alter table public.dev_raw_logs enable row level security;

drop policy if exists "dev profile can read feature flags" on public.dev_feature_flags;
create policy "dev profile can read feature flags"
on public.dev_feature_flags
for select
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and lower(p.role) = 'dev'
      and coalesce(lower(p.status), 'active') = 'active'
  )
);

drop policy if exists "dev profile can read alerts" on public.dev_alerts;
create policy "dev profile can read alerts"
on public.dev_alerts
for select
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and lower(p.role) = 'dev'
      and coalesce(lower(p.status), 'active') = 'active'
  )
);

drop policy if exists "dev profile can read api requests" on public.dev_api_requests;
create policy "dev profile can read api requests"
on public.dev_api_requests
for select
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and lower(p.role) = 'dev'
      and coalesce(lower(p.status), 'active') = 'active'
  )
);

drop policy if exists "dev profile can read raw logs" on public.dev_raw_logs;
create policy "dev profile can read raw logs"
on public.dev_raw_logs
for select
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and lower(p.role) = 'dev'
      and coalesce(lower(p.status), 'active') = 'active'
  )
);

-- Required Vercel/server environment variable for active Dev Dashboard tools:
--   SUPABASE_SERVICE_ROLE_KEY=<your Supabase service_role key>
-- The route handlers keep this key server-only and require the ChemDeckDev cookie before using it.

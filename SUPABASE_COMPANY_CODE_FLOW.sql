create extension if not exists pgcrypto with schema extensions;

create table if not exists public.companies (
  id uuid primary key default extensions.gen_random_uuid(),
  company_name text not null,
  company_code text not null unique,
  created_by uuid,
  created_at timestamptz not null default now()
);

alter table public.companies
  add column if not exists company_name text,
  add column if not exists company_code text,
  add column if not exists created_by uuid,
  add column if not exists created_at timestamptz not null default now();

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  role text not null default 'worker',
  status text not null default 'active',
  active boolean not null default true,
  company_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.users (
  id uuid primary key,
  email text unique,
  full_name text,
  role text not null default 'worker',
  status text not null default 'active',
  active boolean not null default true,
  company_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists role text not null default 'worker',
  add column if not exists company_id uuid,
  add column if not exists status text not null default 'active',
  add column if not exists active boolean not null default true;

alter table public.users
  add column if not exists role text not null default 'worker',
  add column if not exists company_id uuid,
  add column if not exists status text not null default 'active',
  add column if not exists active boolean not null default true;

do $$
begin
  if to_regclass('public.app_accounts') is not null then
    alter table public.app_accounts
      add column if not exists role text not null default 'worker',
      add column if not exists company_id uuid,
      add column if not exists status text not null default 'active',
      add column if not exists active boolean not null default true;
  end if;
end $$;

create unique index if not exists companies_company_code_unique_idx
on public.companies (company_code);

create index if not exists companies_created_by_idx
on public.companies (created_by);

create index if not exists profiles_company_id_idx
on public.profiles (company_id);

create index if not exists users_company_id_idx
on public.users (company_id);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'companies_created_by_fkey'
      and conrelid = 'public.companies'::regclass
  ) then
    alter table public.companies
      add constraint companies_created_by_fkey
      foreign key (created_by)
      references auth.users(id)
      on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_company_id_fkey'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_company_id_fkey
      foreign key (company_id)
      references public.companies(id)
      on delete restrict;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'users_company_id_fkey'
      and conrelid = 'public.users'::regclass
  ) then
    alter table public.users
      add constraint users_company_id_fkey
      foreign key (company_id)
      references public.companies(id)
      on delete restrict;
  end if;
end $$;

alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.users enable row level security;

drop policy if exists "authenticated can read company join codes" on public.companies;
create policy "authenticated can read company join codes"
on public.companies
for select
to authenticated
using (true);

drop policy if exists "users can join one company from profile" on public.profiles;
create policy "users can join one company from profile"
on public.profiles
for update
to authenticated
using (id = auth.uid() and company_id is null and lower(role) <> 'dev')
with check (id = auth.uid() and company_id is not null and lower(role) <> 'dev');

drop policy if exists "users can join one company from users row" on public.users;
create policy "users can join one company from users row"
on public.users
for update
to authenticated
using (id = auth.uid() and company_id is null and lower(role) <> 'dev')
with check (id = auth.uid() and company_id is not null and lower(role) <> 'dev');

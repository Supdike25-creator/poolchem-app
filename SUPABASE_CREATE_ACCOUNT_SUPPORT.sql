create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  role text not null default 'worker',
  status text not null default 'active',
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
  company_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists email text,
  add column if not exists full_name text,
  add column if not exists role text not null default 'worker',
  add column if not exists status text not null default 'active',
  add column if not exists company_id uuid,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.users
  add column if not exists email text,
  add column if not exists full_name text,
  add column if not exists role text not null default 'worker',
  add column if not exists status text not null default 'active',
  add column if not exists company_id uuid,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists profiles_email_unique_idx
on public.profiles (lower(email))
where email is not null;

create unique index if not exists users_email_unique_idx
on public.users (lower(email))
where email is not null;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'profiles_role_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles drop constraint profiles_role_check;
  end if;

  alter table public.profiles
    add constraint profiles_role_check
    check (lower(role) in ('worker', 'boss', 'dev', 'guard', 'manager', 'admin', 'supervisor', 'owner'));

  if exists (
    select 1
    from pg_constraint
    where conname = 'users_role_check'
      and conrelid = 'public.users'::regclass
  ) then
    alter table public.users drop constraint users_role_check;
  end if;

  alter table public.users
    add constraint users_role_check
    check (lower(role) in ('worker', 'boss', 'dev', 'guard', 'manager', 'admin', 'supervisor', 'owner'));
end $$;

alter table public.profiles enable row level security;
alter table public.users enable row level security;

drop policy if exists "users can read own profile" on public.profiles;
create policy "users can read own profile"
on public.profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists "users can read own user row" on public.users;
create policy "users can read own user row"
on public.users
for select
to authenticated
using (id = auth.uid());

create or replace function public.handle_new_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    role,
    status,
    company_id,
    created_at,
    updated_at
  )
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', lower(new.email)),
    'worker',
    'active',
    null,
    now(),
    now()
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(public.profiles.full_name, excluded.full_name),
        role = coalesce(public.profiles.role, excluded.role),
        status = coalesce(public.profiles.status, excluded.status),
        updated_at = now();

  insert into public.users (
    id,
    email,
    full_name,
    role,
    status,
    company_id,
    created_at,
    updated_at
  )
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', lower(new.email)),
    'worker',
    'active',
    null,
    now(),
    now()
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(public.users.full_name, excluded.full_name),
        role = coalesce(public.users.role, excluded.role),
        status = coalesce(public.users.status, excluded.status),
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_create_profile on auth.users;
create trigger on_auth_user_created_create_profile
after insert on auth.users
for each row execute function public.handle_new_auth_user_profile();

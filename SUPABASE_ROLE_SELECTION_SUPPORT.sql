create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  role text not null default 'guard',
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
  role text not null default 'guard',
  status text not null default 'active',
  active boolean not null default true,
  company_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists role text not null default 'guard',
  add column if not exists status text not null default 'active',
  add column if not exists active boolean not null default true,
  add column if not exists company_id uuid;

alter table public.users
  add column if not exists role text not null default 'guard',
  add column if not exists status text not null default 'active',
  add column if not exists active boolean not null default true,
  add column if not exists company_id uuid;

alter table public.profiles alter column role set default 'guard';
alter table public.users alter column role set default 'guard';

update public.profiles
set role = 'guard'
where role is null or btrim(role) = '';

update public.users
set role = 'guard'
where role is null or btrim(role) = '';

update public.profiles
set role = 'boss'
where lower(role) = 'manager';

update public.users
set role = 'boss'
where lower(role) = 'manager';

update public.profiles
set role = 'guard'
where lower(role) in ('lifeguard', 'worker');

update public.users
set role = 'guard'
where lower(role) in ('lifeguard', 'worker');

alter table public.profiles alter column role set not null;
alter table public.users alter column role set not null;

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'profiles_role_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles drop constraint profiles_role_check;
  end if;

  alter table public.profiles
    add constraint profiles_role_check
    check (lower(role) in ('boss', 'guard', 'dev'));

  if exists (
    select 1 from pg_constraint
    where conname = 'users_role_check'
      and conrelid = 'public.users'::regclass
  ) then
    alter table public.users drop constraint users_role_check;
  end if;

  alter table public.users
    add constraint users_role_check
    check (lower(role) in ('boss', 'guard', 'dev'));
end $$;

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
    active,
    company_id,
    created_at,
    updated_at
  )
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', lower(new.email)),
    case
      when lower(coalesce(new.raw_user_meta_data->>'role', '')) in ('boss', 'manager') then 'boss'
      when lower(coalesce(new.raw_user_meta_data->>'role', '')) = 'dev' then 'dev'
      else 'guard'
    end,
    'active',
    true,
    null,
    now(),
    now()
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(public.profiles.full_name, excluded.full_name),
        role = coalesce(nullif(public.profiles.role, ''), excluded.role, 'guard'),
        status = coalesce(public.profiles.status, excluded.status),
        active = coalesce(public.profiles.active, excluded.active),
        updated_at = now();

  insert into public.users (
    id,
    email,
    full_name,
    role,
    status,
    active,
    company_id,
    created_at,
    updated_at
  )
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', lower(new.email)),
    case
      when lower(coalesce(new.raw_user_meta_data->>'role', '')) in ('boss', 'manager') then 'boss'
      when lower(coalesce(new.raw_user_meta_data->>'role', '')) = 'dev' then 'dev'
      else 'guard'
    end,
    'active',
    true,
    null,
    now(),
    now()
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(public.users.full_name, excluded.full_name),
        role = coalesce(nullif(public.users.role, ''), excluded.role, 'guard'),
        status = coalesce(public.users.status, excluded.status),
        active = coalesce(public.users.active, excluded.active),
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_create_profile on auth.users;
create trigger on_auth_user_created_create_profile
after insert on auth.users
for each row execute function public.handle_new_auth_user_profile();

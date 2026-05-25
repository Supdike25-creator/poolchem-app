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

create unique index if not exists companies_company_code_unique_idx on public.companies(company_code);
create index if not exists companies_created_by_idx on public.companies(created_by);

create table if not exists public.users (
  id uuid primary key default extensions.gen_random_uuid(),
  email text unique,
  full_name text,
  role text not null default 'worker',
  company_id uuid,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.normalize_app_role(p_role text)
returns text
language sql
immutable
as $$
  select case
    when lower(coalesce(p_role, 'worker')) = 'dev' then 'dev'
    when lower(coalesce(p_role, 'worker')) in ('boss', 'manager', 'admin', 'supervisor', 'owner') then 'boss'
    when lower(coalesce(p_role, 'worker')) in ('worker', 'guard', 'lifeguard', 'technician') then 'worker'
    else 'guard'
  end;
$$;

create or replace function public.generate_company_code()
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  candidate text;
begin
  loop
    candidate := upper(substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 8));
    exit when not exists (select 1 from public.companies where company_code = candidate);
  end loop;

  return candidate;
end;
$$;

alter table public.users
  add column if not exists role text not null default 'worker',
  add column if not exists company_id uuid;

alter table public.profiles
  add column if not exists role text not null default 'worker',
  add column if not exists company_id uuid;

alter table public.app_accounts
  add column if not exists role text not null default 'worker',
  add column if not exists company_id uuid;

alter table public.app_account_signup_requests
  add column if not exists role text not null default 'worker';

alter table public.pools
  add column if not exists company_id uuid;

do $$
declare
  constraint_record record;
begin
  for constraint_record in
    select distinct con.conname, con.conrelid::regclass::text as table_name
    from pg_constraint
    con
    join pg_attribute att
      on att.attrelid = con.conrelid
     and att.attnum = any(con.conkey)
    where con.contype = 'f'
      and con.conrelid in (
        'public.users'::regclass,
        'public.profiles'::regclass,
        'public.app_accounts'::regclass,
        'public.pools'::regclass
      )
      and att.attname in ('company_id', 'organization_id')
  loop
    execute format('alter table %s drop constraint if exists %I', constraint_record.table_name, constraint_record.conname);
  end loop;
end $$;

do $$
begin
  if exists (select 1 from pg_constraint where conname = 'users_role_check' and conrelid = 'public.users'::regclass) then
    alter table public.users drop constraint users_role_check;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'users_role_check' and conrelid = 'public.users'::regclass) then
    alter table public.users add constraint users_role_check check (lower(role) in ('boss', 'guard', 'dev'));
  end if;

  if exists (select 1 from pg_constraint where conname = 'profiles_role_check' and conrelid = 'public.profiles'::regclass) then
    alter table public.profiles drop constraint profiles_role_check;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_role_check' and conrelid = 'public.profiles'::regclass) then
    alter table public.profiles add constraint profiles_role_check check (lower(role) in ('boss', 'guard', 'dev'));
  end if;

  if exists (select 1 from pg_constraint where conname = 'app_accounts_role_check' and conrelid = 'public.app_accounts'::regclass) then
    alter table public.app_accounts drop constraint app_accounts_role_check;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'app_accounts_role_check' and conrelid = 'public.app_accounts'::regclass) then
    alter table public.app_accounts add constraint app_accounts_role_check check (lower(role) in ('boss', 'guard', 'dev'));
  end if;

  if exists (select 1 from pg_constraint where conname = 'app_account_signup_requests_role_check' and conrelid = 'public.app_account_signup_requests'::regclass) then
    alter table public.app_account_signup_requests drop constraint app_account_signup_requests_role_check;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'app_account_signup_requests_role_check' and conrelid = 'public.app_account_signup_requests'::regclass) then
    alter table public.app_account_signup_requests add constraint app_account_signup_requests_role_check check (lower(role) in ('boss', 'guard', 'dev'));
  end if;
end $$;

update public.users
set role = case
  when lower(role) = 'dev' then 'dev'
  when lower(role) in ('boss', 'manager', 'admin', 'supervisor', 'owner') then 'boss'
  else 'guard'
end;

update public.profiles
set role = case
  when lower(role) = 'dev' then 'dev'
  when lower(role) in ('boss', 'manager', 'admin', 'supervisor', 'owner') then 'boss'
  else 'guard'
end;

update public.app_accounts
set role = case
  when lower(role) = 'dev' then 'dev'
  when lower(role) in ('boss', 'manager', 'admin', 'supervisor', 'owner') then 'boss'
  else 'guard'
end;

update public.app_account_signup_requests
set role = case
  when lower(role) = 'dev' then 'dev'
  when lower(role) in ('boss', 'manager', 'admin', 'supervisor', 'owner') then 'boss'
  else 'guard'
end;

insert into public.companies (company_name, company_code, created_by)
select 'ChemDeck Default Company', public.generate_company_code(), null
where not exists (select 1 from public.companies);

update public.users
set company_id = (select id from public.companies order by created_at asc limit 1)
where lower(role) <> 'dev' and company_id is null;

update public.users
set company_id = null
where lower(role) = 'dev';

update public.users
set company_id = (select id from public.companies order by created_at asc limit 1)
where lower(role) <> 'dev'
  and company_id is not null
  and not exists (
    select 1 from public.companies c
    where c.id = public.users.company_id
  );

update public.profiles
set company_id = coalesce(
  company_id,
  (select id from public.companies order by created_at asc limit 1)
)
where lower(role) <> 'dev' and company_id is null;

update public.profiles
set company_id = null
where lower(role) = 'dev';

update public.profiles
set company_id = (select id from public.companies order by created_at asc limit 1)
where lower(role) <> 'dev'
  and company_id is not null
  and not exists (
    select 1 from public.companies c
    where c.id = public.profiles.company_id
  );

update public.app_accounts
set company_id = (select id from public.companies order by created_at asc limit 1)
where lower(role) <> 'dev' and company_id is null;

update public.app_accounts
set company_id = null
where lower(role) = 'dev';

update public.app_accounts
set company_id = (select id from public.companies order by created_at asc limit 1)
where lower(role) <> 'dev'
  and company_id is not null
  and not exists (
    select 1 from public.companies c
    where c.id = public.app_accounts.company_id
  );

update public.pools
set company_id = coalesce(
  company_id,
  (select id from public.companies order by created_at asc limit 1)
)
where company_id is null;

update public.pools
set company_id = (select id from public.companies order by created_at asc limit 1)
where company_id is not null
  and not exists (
    select 1 from public.companies c
    where c.id = public.pools.company_id
  );

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
    where conname = 'users_company_id_fkey'
      and conrelid = 'public.users'::regclass
  ) then
    alter table public.users
      add constraint users_company_id_fkey
      foreign key (company_id)
      references public.companies(id)
      on delete restrict;
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
    where conname = 'app_accounts_company_id_fkey'
      and conrelid = 'public.app_accounts'::regclass
  ) then
    alter table public.app_accounts
      add constraint app_accounts_company_id_fkey
      foreign key (company_id)
      references public.companies(id)
      on delete restrict;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'pools_company_id_fkey'
      and conrelid = 'public.pools'::regclass
  ) then
    alter table public.pools
      add constraint pools_company_id_fkey
      foreign key (company_id)
      references public.companies(id)
      on delete restrict;
  end if;
end $$;

do $$
begin
  if exists (select 1 from pg_constraint where conname = 'users_role_check' and conrelid = 'public.users'::regclass) then
    alter table public.users drop constraint users_role_check;
  end if;
    alter table public.users add constraint users_role_check check (lower(role) in ('boss', 'guard', 'dev'));

  if exists (select 1 from pg_constraint where conname = 'profiles_role_check' and conrelid = 'public.profiles'::regclass) then
    alter table public.profiles drop constraint profiles_role_check;
  end if;
    alter table public.profiles add constraint profiles_role_check check (lower(role) in ('boss', 'guard', 'dev'));

  if exists (select 1 from pg_constraint where conname = 'app_accounts_role_check' and conrelid = 'public.app_accounts'::regclass) then
    alter table public.app_accounts drop constraint app_accounts_role_check;
  end if;
    alter table public.app_accounts add constraint app_accounts_role_check check (lower(role) in ('boss', 'guard', 'dev'));

  if exists (select 1 from pg_constraint where conname = 'app_account_signup_requests_role_check' and conrelid = 'public.app_account_signup_requests'::regclass) then
    alter table public.app_account_signup_requests drop constraint app_account_signup_requests_role_check;
  end if;
    alter table public.app_account_signup_requests add constraint app_account_signup_requests_role_check check (lower(role) in ('boss', 'guard', 'dev'));
end $$;

do $$
begin
  if exists (select 1 from pg_constraint where conname = 'users_non_dev_company_required' and conrelid = 'public.users'::regclass) then
    alter table public.users drop constraint users_non_dev_company_required;
  end if;

  if exists (select 1 from pg_constraint where conname = 'profiles_non_dev_company_required' and conrelid = 'public.profiles'::regclass) then
    alter table public.profiles drop constraint profiles_non_dev_company_required;
  end if;

  if exists (select 1 from pg_constraint where conname = 'app_accounts_non_dev_company_required' and conrelid = 'public.app_accounts'::regclass) then
    alter table public.app_accounts drop constraint app_accounts_non_dev_company_required;
  end if;
end $$;

alter table public.pools alter column company_id set not null;

create index if not exists users_company_id_idx on public.users(company_id);
create index if not exists users_role_company_id_idx on public.users(lower(role), company_id);
create index if not exists profiles_company_id_idx on public.profiles(company_id);
create index if not exists profiles_role_company_id_idx on public.profiles(lower(role), company_id);
create index if not exists app_accounts_company_id_idx on public.app_accounts(company_id);
create index if not exists app_accounts_role_company_id_idx on public.app_accounts(lower(role), company_id);
create index if not exists pools_company_id_idx on public.pools(company_id);

create or replace function public.create_company_for_boss(
  p_boss_user_id uuid,
  p_company_name text
)
returns table (
  company_id uuid,
  company_name text,
  company_code text
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  inserted_company public.companies%rowtype;
begin
  if nullif(trim(coalesce(p_company_name, '')), '') is null then
    raise exception 'Company name is required';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = p_boss_user_id
      and lower(role) = 'boss'
  ) then
    raise exception 'Only boss accounts can create companies';
  end if;

  insert into public.companies (company_name, company_code, created_by)
  values (trim(p_company_name), public.generate_company_code(), p_boss_user_id)
  returning * into inserted_company;

  update public.profiles set company_id = inserted_company.id
  where id = p_boss_user_id;

  update public.users set company_id = inserted_company.id
  where id = p_boss_user_id;

  update public.app_accounts set company_id = inserted_company.id
  where auth_user_id = p_boss_user_id;

  return query select inserted_company.id, inserted_company.company_name, inserted_company.company_code;
end;
$$;

create or replace function public.join_company_by_code(
  p_user_id uuid,
  p_company_code text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_company_id uuid;
begin
  select id into target_company_id
  from public.companies
  where company_code = upper(trim(p_company_code));

  if target_company_id is null then
    raise exception 'Invalid company code';
  end if;

  if exists (select 1 from public.profiles where id = p_user_id and lower(role) = 'dev') then
    raise exception 'Dev accounts do not join companies';
  end if;

  update public.profiles
  set company_id = target_company_id
  where id = p_user_id
    and lower(role) = 'guard';

  update public.users
  set company_id = target_company_id
  where id = p_user_id
    and lower(role) = 'guard';

  update public.app_accounts
  set company_id = target_company_id
  where auth_user_id = p_user_id
    and lower(role) = 'guard';

  return target_company_id;
end;
$$;

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

drop trigger if exists set_pool_company_from_current_user_trigger on public.pools;
create trigger set_pool_company_from_current_user_trigger
before insert or update on public.pools
for each row execute function public.set_pool_company_from_current_user();

drop trigger if exists ensure_users_non_dev_company_trigger on public.users;
drop trigger if exists ensure_profiles_non_dev_company_trigger on public.profiles;
drop trigger if exists ensure_app_accounts_non_dev_company_trigger on public.app_accounts;

drop function if exists public.ensure_non_dev_company();

create or replace view public.non_dev_accounts_missing_company as
select 'profiles' as source_table, id::text as account_id, role, email
from public.profiles
where lower(role) <> 'dev' and company_id is null
union all
select 'users' as source_table, id::text as account_id, role, email
from public.users
where lower(role) <> 'dev' and company_id is null
union all
select 'app_accounts' as source_table, id::text as account_id, role, email
from public.app_accounts
where lower(role) <> 'dev' and company_id is null;

alter table public.companies enable row level security;
alter table public.users enable row level security;
alter table public.profiles enable row level security;
alter table public.pools enable row level security;
alter table public.app_accounts enable row level security;

drop policy if exists "company scoped companies select" on public.companies;
create policy "company scoped companies select" on public.companies
for select to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (lower(p.role) = 'dev' or p.company_id = companies.id)
  )
);

drop policy if exists "company scoped users select" on public.users;
create policy "company scoped users select" on public.users
for select to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (lower(p.role) = 'dev' or p.company_id = users.company_id)
  )
);

drop policy if exists "company scoped profiles select" on public.profiles;
create policy "company scoped profiles select" on public.profiles
for select to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (lower(p.role) = 'dev' or p.company_id = profiles.company_id)
  )
);

drop policy if exists "users can read own profile during company setup" on public.profiles;
create policy "users can read own profile during company setup" on public.profiles
for select to authenticated
using (id = auth.uid());

drop policy if exists "company scoped pools select" on public.pools;
create policy "company scoped pools select" on public.pools
for select to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (lower(p.role) = 'dev' or p.company_id = pools.company_id)
  )
);

drop policy if exists "boss can insert company pools" on public.pools;
create policy "boss can insert company pools" on public.pools
for insert to authenticated
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and lower(p.role) in ('boss', 'dev')
      and (lower(p.role) = 'dev' or p.company_id = pools.company_id)
  )
);

drop policy if exists "boss can update company pools" on public.pools;
create policy "boss can update company pools" on public.pools
for update to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and lower(p.role) in ('boss', 'dev')
      and (lower(p.role) = 'dev' or p.company_id = pools.company_id)
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and lower(p.role) in ('boss', 'dev')
      and (lower(p.role) = 'dev' or p.company_id = pools.company_id)
  )
);

drop policy if exists "boss can delete company pools" on public.pools;
create policy "boss can delete company pools" on public.pools
for delete to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and lower(p.role) in ('boss', 'dev')
      and (lower(p.role) = 'dev' or p.company_id = pools.company_id)
  )
);

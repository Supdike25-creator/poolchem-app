-- Role rename migration: boss/supervisor → manager, guard/worker → employee
-- Run in Supabase SQL Editor or via supabase db push

-- ---------------------------------------------------------------------------
-- 1. Update role values in all tables
-- ---------------------------------------------------------------------------

update public.profiles
  set role = 'manager'
  where lower(role) in ('boss', 'supervisor');

update public.profiles
  set role = 'employee'
  where lower(role) in ('guard', 'worker', 'lifeguard', 'technician');

update public.users
  set role = 'manager'
  where lower(role) in ('boss', 'supervisor');

update public.users
  set role = 'employee'
  where lower(role) in ('guard', 'worker', 'lifeguard', 'technician');

update public.app_accounts
  set role = 'manager'
  where lower(role) in ('boss', 'supervisor', 'manager', 'admin');

update public.app_accounts
  set role = 'employee'
  where lower(role) in ('guard', 'worker', 'lifeguard', 'technician');

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'app_account_signup_requests'
  ) then
    execute $sql$
      update public.app_account_signup_requests
        set role = 'manager'
        where lower(role) in ('boss', 'supervisor', 'manager', 'admin');
      update public.app_account_signup_requests
        set role = 'employee'
        where lower(role) in ('guard', 'worker', 'lifeguard', 'technician');
    $sql$;
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'organization_members'
  ) then
    execute $sql$
      update public.organization_members
        set role = 'manager'
        where lower(role) in ('boss', 'supervisor');
      update public.organization_members
        set role = 'employee'
        where lower(role) in ('guard', 'worker', 'lifeguard', 'technician');
    $sql$;
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'invites'
  ) then
    execute $sql$
      update public.invites
        set role = 'manager'
        where lower(role) in ('boss', 'supervisor');
      update public.invites
        set role = 'employee'
        where lower(role) in ('guard', 'worker', 'lifeguard', 'technician');
    $sql$;
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'user_company_memberships'
  ) then
    execute $sql$
      update public.user_company_memberships
        set role = 'manager'
        where lower(role) in ('boss', 'supervisor');
      update public.user_company_memberships
        set role = 'employee'
        where lower(role) in ('guard', 'worker', 'lifeguard', 'technician');
    $sql$;
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'company_invites'
  ) then
    execute $sql$
      update public.company_invites
        set invited_role = 'manager'
        where lower(invited_role) in ('boss', 'supervisor', 'manager');
      update public.company_invites
        set invited_role = 'employee'
        where lower(invited_role) in ('guard', 'worker', 'lifeguard', 'technician');
    $sql$;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Replace CHECK constraints on role columns
-- ---------------------------------------------------------------------------

do $$
declare
  constraint_record record;
begin
  for constraint_record in
    select c.conname, t.relname as table_name
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and c.contype = 'c'
      and (
        c.conname like '%role%check%'
        or c.conname in (
          'users_role_check',
          'profiles_role_check',
          'app_accounts_role_check',
          'app_account_signup_requests_role_check',
          'company_invites_role_check'
        )
      )
  loop
    execute format('alter table public.%I drop constraint if exists %I', constraint_record.table_name, constraint_record.conname);
  end loop;
end $$;

alter table public.users
  add constraint users_role_check
  check (lower(role) in ('manager', 'employee', 'admin', 'dev'));

alter table public.profiles
  add constraint profiles_role_check
  check (lower(role) in ('manager', 'employee', 'admin', 'dev'));

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'app_accounts') then
    alter table public.app_accounts
      add constraint app_accounts_role_check
      check (lower(role) in ('manager', 'employee', 'admin', 'dev'));
  end if;
exception when duplicate_object then null;
end $$;

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'app_account_signup_requests') then
    alter table public.app_account_signup_requests
      add constraint app_account_signup_requests_role_check
      check (lower(role) in ('manager', 'employee', 'admin', 'dev'));
  end if;
exception when duplicate_object then null;
end $$;

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'company_invites') then
    alter table public.company_invites drop constraint if exists company_invites_role_check;
    alter table public.company_invites
      add constraint company_invites_role_check
      check (lower(invited_role) in ('manager', 'employee', 'admin'));
  end if;
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Update role-checking functions (preserve behavior, new role names)
-- ---------------------------------------------------------------------------

create or replace function public.normalize_app_role(p_role text)
returns text
language sql
immutable
as $$
  select case
    when lower(coalesce(p_role, 'employee')) = 'dev' then 'dev'
    when lower(coalesce(p_role, 'employee')) in ('admin', 'manager', 'boss', 'supervisor', 'owner') then 'manager'
    else 'employee'
  end;
$$;

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
      and lower(role) in ('manager', 'admin', 'boss')
  ) then
    raise exception 'Only manager accounts can create companies';
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
    and lower(role) in ('employee', 'guard', 'worker');

  update public.users
  set company_id = target_company_id
  where id = p_user_id
    and lower(role) in ('employee', 'guard', 'worker');

  update public.app_accounts
  set company_id = target_company_id
  where auth_user_id = p_user_id
    and lower(role) in ('employee', 'guard', 'worker');

  return target_company_id;
end;
$$;

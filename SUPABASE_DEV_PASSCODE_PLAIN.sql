-- Dev admin: store viewable passcodes for test accounts + reset helper.
-- Run in Supabase SQL Editor after SUPABASE_DEV_CREATE_USER.sql.

create extension if not exists pgcrypto with schema extensions;

alter table public.app_accounts
  add column if not exists passcode_plain text;

create or replace function public.dev_admin_set_passcode(
  p_email text,
  p_passcode text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_passcode text := trim(coalesce(p_passcode, ''));
  v_account public.app_accounts%rowtype;
begin
  if v_email = '' then
    raise exception 'Email is required';
  end if;

  if length(v_passcode) < 4 then
    raise exception 'Passcode must be at least 4 characters';
  end if;

  update public.app_accounts
  set
    passcode_hash = extensions.crypt(v_passcode, extensions.gen_salt('bf')),
    passcode_plain = v_passcode
  where lower(email) = v_email
  returning * into v_account;

  if v_account.id is null then
    raise exception 'App account not found for that email';
  end if;

  return jsonb_build_object(
    'app_account_id', v_account.id,
    'username', v_account.username,
    'email', v_account.email,
    'passcode', v_passcode
  );
end;
$$;

grant execute on function public.dev_admin_set_passcode(text, text) to service_role;

-- Keep create-user in sync so new accounts are viewable in Dev Admin.
create or replace function public.dev_admin_create_user(
  p_name text,
  p_passcode text,
  p_role text default 'guard',
  p_company_id uuid default null,
  p_email text default null,
  p_username text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user_id uuid := gen_random_uuid();
  v_username text;
  v_email text;
  v_role text;
  v_workplace_role text;
  v_app_role text;
  v_passcode text;
  v_app_account_id uuid;
  v_base text;
  v_suffix int := 0;
begin
  if nullif(trim(coalesce(p_name, '')), '') is null then
    raise exception 'Name is required';
  end if;

  v_passcode := trim(coalesce(p_passcode, ''));
  if length(v_passcode) < 4 then
    raise exception 'Passcode must be at least 4 characters';
  end if;

  v_role := lower(trim(coalesce(p_role, 'guard')));

  v_workplace_role := case
    when v_role = 'dev' then 'dev'
    when v_role = 'supervisor' then 'supervisor'
    when v_role in ('boss', 'manager', 'admin', 'owner') then 'manager'
    else 'guard'
  end;

  v_app_role := case
    when v_workplace_role = 'dev' then 'dev'
    when v_workplace_role in ('manager', 'supervisor') then 'boss'
    else 'guard'
  end;

  v_username := nullif(trim(coalesce(p_username, '')), '');
  if v_username is null then
    v_base := lower(regexp_replace(trim(p_name), '[^a-zA-Z0-9]+', '.', 'g'));
    v_base := trim(both '.' from coalesce(nullif(v_base, ''), 'user'));
    v_base := left(v_base, 18);
    v_username := v_base || floor(1000 + random() * 9000)::int::text;
    while exists (select 1 from public.app_accounts where username = v_username) loop
      v_suffix := v_suffix + 1;
      v_username := v_base || floor(1000 + random() * 9000)::int::text || v_suffix::text;
    end loop;
  elsif exists (select 1 from public.app_accounts where username = v_username) then
    raise exception 'That username is already in use';
  end if;

  v_email := nullif(lower(trim(coalesce(p_email, ''))), '');
  if v_email is null then
    v_email := v_username || '@chemdeck.local';
  end if;

  if exists (select 1 from public.users where lower(email) = v_email) then
    raise exception 'That email is already in use';
  end if;

  insert into public.users (id, email, full_name, role, company_id, status)
  values (v_user_id, v_email, trim(p_name), v_workplace_role, p_company_id, 'active');

  insert into public.app_accounts (name, birthday, username, passcode_hash, passcode_plain, role, email, provider, company_id)
  values (
    trim(p_name),
    '2000-01-01',
    v_username,
    extensions.crypt(v_passcode, extensions.gen_salt('bf')),
    v_passcode,
    v_app_role,
    v_email,
    'manual',
    p_company_id
  )
  returning id into v_app_account_id;

  return jsonb_build_object(
    'user_id', v_user_id,
    'app_account_id', v_app_account_id,
    'name', trim(p_name),
    'username', v_username,
    'email', v_email,
    'passcode', v_passcode,
    'role', v_workplace_role,
    'login_role', v_app_role
  );
exception
  when unique_violation then
    raise exception 'Username or email already exists';
end;
$$;

grant execute on function public.dev_admin_create_user(text, text, text, uuid, text, text) to service_role;

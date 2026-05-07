create extension if not exists pgcrypto with schema extensions;

create table if not exists public.app_accounts (
  id uuid primary key default extensions.gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete cascade,
  name text not null,
  birthday date,
  username text not null unique,
  passcode_hash text not null,
  role text not null check (role in ('manager', 'guard')),
  email text,
  provider text not null default 'manual' check (provider in ('manual', 'google')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_account_sessions (
  id uuid primary key default extensions.gen_random_uuid(),
  account_id uuid not null references public.app_accounts(id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null default now() + interval '30 days',
  created_at timestamptz not null default now()
);

create index if not exists app_account_sessions_account_id_idx on public.app_account_sessions(account_id);
create index if not exists app_account_sessions_expires_at_idx on public.app_account_sessions(expires_at);
create unique index if not exists app_accounts_email_unique_idx on public.app_accounts (lower(email)) where email is not null;

alter table public.app_accounts enable row level security;
alter table public.app_account_sessions enable row level security;

revoke all on public.app_accounts from anon, authenticated;
revoke all on public.app_account_sessions from anon, authenticated;

create or replace function public.normalize_app_role(p_role text)
returns text
language sql
immutable
as $$
  select case
    when lower(coalesce(p_role, 'guard')) in ('admin', 'manager', 'supervisor') then 'manager'
    else 'guard'
  end;
$$;

create or replace function public.make_app_username(p_name text, p_birthday date)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  base_username text;
  birthday_digits text;
  candidate text;
  suffix int := 0;
begin
  base_username := lower(regexp_replace(coalesce(p_name, 'user'), '[^a-zA-Z0-9]+', '.', 'g'));
  base_username := trim(both '.' from base_username);
  base_username := left(coalesce(nullif(base_username, ''), 'user'), 18);
  birthday_digits := coalesce(right(regexp_replace(coalesce(p_birthday::text, ''), '\D', '', 'g'), 4), '');

  if birthday_digits = '' then
    birthday_digits := floor(1000 + random() * 9000)::int::text;
  end if;

  candidate := base_username || birthday_digits;

  while exists (select 1 from public.app_accounts where username = candidate) loop
    suffix := suffix + 1;
    candidate := base_username || birthday_digits || suffix::text;
  end loop;

  return candidate;
end;
$$;

create or replace function public.issue_app_session(p_account_id uuid)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  raw_token text;
begin
  raw_token := encode(extensions.gen_random_bytes(32), 'hex');

  insert into public.app_account_sessions (account_id, token_hash)
  values (p_account_id, extensions.crypt(raw_token, extensions.gen_salt('bf')));

  delete from public.app_account_sessions
  where expires_at < now();

  return raw_token;
end;
$$;

create or replace function public.create_app_account(
  p_name text,
  p_birthday date,
  p_role text default 'guard'
)
returns table (
  id uuid,
  name text,
  birthday date,
  username text,
  passcode text,
  session_token text,
  role text,
  email text,
  provider text
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  generated_username text;
  generated_passcode text;
  normalized_role text;
  verified_email text;
  inserted_account public.app_accounts%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Email verification is required';
  end if;

  verified_email := nullif(lower(trim(coalesce(auth.jwt() ->> 'email', ''))), '');

  if verified_email is null then
    raise exception 'A verified email is required';
  end if;

  if nullif(trim(coalesce(p_name, '')), '') is null then
    raise exception 'Name is required';
  end if;

  if p_birthday is null then
    raise exception 'Birthday is required';
  end if;

  normalized_role := public.normalize_app_role(p_role);
  generated_username := public.make_app_username(p_name, p_birthday);
  generated_passcode := floor(100000 + random() * 900000)::int::text;

  insert into public.app_accounts (auth_user_id, name, birthday, username, passcode_hash, role, email, provider)
  values (
    auth.uid(),
    trim(p_name),
    p_birthday,
    generated_username,
    extensions.crypt(generated_passcode, extensions.gen_salt('bf')),
    normalized_role,
    verified_email,
    'manual'
  )
  returning * into inserted_account;

  return query
  select
    inserted_account.id,
    inserted_account.name,
    inserted_account.birthday,
    inserted_account.username,
    generated_passcode,
    public.issue_app_session(inserted_account.id),
    inserted_account.role,
    inserted_account.email,
    inserted_account.provider;
exception
  when unique_violation then
    raise exception 'That email already has a ChemDeck account';
end;
$$;

create or replace function public.verify_app_account(
  p_username text,
  p_passcode text
)
returns table (
  id uuid,
  name text,
  birthday date,
  username text,
  session_token text,
  role text,
  email text,
  provider text
)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  return query
  select
    account.id,
    account.name,
    account.birthday,
    account.username,
    public.issue_app_session(account.id),
    account.role,
    account.email,
    account.provider
  from public.app_accounts account
  where lower(account.username) = lower(trim(p_username))
    and account.passcode_hash = extensions.crypt(trim(p_passcode), account.passcode_hash)
  limit 1;
end;
$$;

create or replace function public.create_google_app_account(
  p_auth_user_id uuid,
  p_name text,
  p_email text,
  p_role text default 'guard'
)
returns table (
  id uuid,
  name text,
  birthday date,
  username text,
  session_token text,
  role text,
  email text,
  provider text
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  generated_username text;
  generated_passcode text;
  normalized_role text;
  upserted_account public.app_accounts%rowtype;
begin
  if auth.uid() is null or auth.uid() <> p_auth_user_id then
    raise exception 'Not allowed';
  end if;

  normalized_role := public.normalize_app_role(p_role);
  generated_username := public.make_app_username(coalesce(nullif(trim(p_name), ''), p_email, 'google.user'), current_date);
  generated_passcode := floor(100000 + random() * 900000)::int::text;

  insert into public.app_accounts (auth_user_id, name, birthday, username, passcode_hash, role, email, provider)
  values (
    p_auth_user_id,
    coalesce(nullif(trim(p_name), ''), p_email, 'Google User'),
    null,
    generated_username,
    extensions.crypt(generated_passcode, extensions.gen_salt('bf')),
    normalized_role,
    p_email,
    'google'
  )
  on conflict (auth_user_id) do update set
    name = excluded.name,
    role = excluded.role,
    email = excluded.email,
    updated_at = now()
  returning * into upserted_account;

  return query
  select
    upserted_account.id,
    upserted_account.name,
    upserted_account.birthday,
    upserted_account.username,
    public.issue_app_session(upserted_account.id),
    upserted_account.role,
    upserted_account.email,
    upserted_account.provider;
end;
$$;

create or replace function public.recover_app_account()
returns table (
  id uuid,
  name text,
  birthday date,
  username text,
  passcode text,
  session_token text,
  role text,
  email text,
  provider text
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  verified_email text;
  generated_passcode text;
  recovered_account public.app_accounts%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Email confirmation is required';
  end if;

  verified_email := nullif(lower(trim(coalesce(auth.jwt() ->> 'email', ''))), '');

  if verified_email is null then
    raise exception 'A verified email is required';
  end if;

  generated_passcode := floor(100000 + random() * 900000)::int::text;

  update public.app_accounts
  set
    passcode_hash = extensions.crypt(generated_passcode, extensions.gen_salt('bf')),
    auth_user_id = coalesce(auth_user_id, auth.uid()),
    updated_at = now()
  where lower(email) = verified_email
  returning * into recovered_account;

  if recovered_account.id is null then
    raise exception 'No ChemDeck account exists for that email';
  end if;

  return query
  select
    recovered_account.id,
    recovered_account.name,
    recovered_account.birthday,
    recovered_account.username,
    generated_passcode,
    public.issue_app_session(recovered_account.id),
    recovered_account.role,
    recovered_account.email,
    recovered_account.provider;
end;
$$;

create or replace function public.verify_app_session(p_session_token text)
returns table (
  id uuid,
  name text,
  birthday date,
  username text,
  role text,
  email text,
  provider text
)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  delete from public.app_account_sessions
  where expires_at < now();

  return query
  select
    account.id,
    account.name,
    account.birthday,
    account.username,
    account.role,
    account.email,
    account.provider
  from public.app_account_sessions session
  join public.app_accounts account on account.id = session.account_id
  where session.expires_at > now()
    and session.token_hash = extensions.crypt(trim(p_session_token), session.token_hash)
  limit 1;
end;
$$;

grant execute on function public.create_app_account(text, date, text) to authenticated;
grant execute on function public.verify_app_account(text, text) to anon, authenticated;
grant execute on function public.create_google_app_account(uuid, text, text, text) to authenticated;
grant execute on function public.verify_app_session(text) to anon, authenticated;
grant execute on function public.recover_app_account() to authenticated;

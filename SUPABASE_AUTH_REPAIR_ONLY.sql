-- Paste this whole file into a NEW Supabase SQL Editor tab and run it once.
-- Do not highlight only part of it; the CREATE FUNCTION blocks must run from start to finish.

drop function if exists public.create_google_app_account(uuid, text, text, text);

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
  passcode text,
  session_token text,
  role text,
  email text,
  provider text
)
language plpgsql
security definer
set search_path = public, extensions
as $google_account$
declare
  generated_username text;
  generated_passcode text;
  normalized_role text;
  normalized_email text;
  existing_account public.app_accounts%rowtype;
  email_account public.app_accounts%rowtype;
  upserted_account public.app_accounts%rowtype;
begin
  if auth.uid() is null or auth.uid() <> p_auth_user_id then
    raise exception 'Not allowed';
  end if;

  normalized_role := public.normalize_app_role(p_role);
  normalized_email := nullif(lower(trim(coalesce(p_email, ''))), '');

  select * into existing_account
  from public.app_accounts
  where auth_user_id = p_auth_user_id
  limit 1;

  if existing_account.id is not null then
    if normalized_email is not null then
      select * into email_account
      from public.app_accounts
      where lower(email) = normalized_email
        and id <> existing_account.id
      limit 1;

      if email_account.id is not null then
        raise exception 'That email already has a ChemDeck account';
      end if;
    end if;

    update public.app_accounts
    set
      name = coalesce(nullif(trim(p_name), ''), existing_account.name),
      role = existing_account.role,
      email = coalesce(normalized_email, existing_account.email),
      provider = 'google',
      updated_at = now()
    where id = existing_account.id
    returning * into upserted_account;

    return query
    select
      upserted_account.id,
      upserted_account.name,
      upserted_account.birthday,
      upserted_account.username,
      null::text,
      public.issue_app_session(upserted_account.id),
      upserted_account.role,
      upserted_account.email,
      upserted_account.provider;
    return;
  end if;

  if normalized_email is not null then
    select * into email_account
    from public.app_accounts
    where lower(email) = normalized_email
    limit 1;

    if email_account.id is not null then
      if email_account.auth_user_id is not null and email_account.auth_user_id <> p_auth_user_id then
        raise exception 'That email already has a ChemDeck account';
      end if;

      update public.app_accounts
      set
        auth_user_id = p_auth_user_id,
        name = coalesce(nullif(trim(p_name), ''), email_account.name),
        role = email_account.role,
        provider = 'google',
        updated_at = now()
      where id = email_account.id
      returning * into upserted_account;

      return query
      select
        upserted_account.id,
        upserted_account.name,
        upserted_account.birthday,
        upserted_account.username,
        null::text,
        public.issue_app_session(upserted_account.id),
        upserted_account.role,
        upserted_account.email,
        upserted_account.provider;
      return;
    end if;
  end if;

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
    normalized_email,
    'google'
  )
  returning * into upserted_account;

  return query
  select
    upserted_account.id,
    upserted_account.name,
    upserted_account.birthday,
    upserted_account.username,
    generated_passcode,
    public.issue_app_session(upserted_account.id),
    upserted_account.role,
    upserted_account.email,
    upserted_account.provider;
end;
$google_account$;

grant execute on function public.create_google_app_account(uuid, text, text, text) to authenticated;

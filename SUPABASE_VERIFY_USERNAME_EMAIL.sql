-- Allow login with username OR email for app_accounts passcode sign-in.
-- Run in Supabase SQL Editor if test users can only log in with username today.

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
  where (
    lower(account.username) = lower(trim(p_username))
    or lower(account.email) = lower(trim(p_username))
  )
    and account.passcode_hash = extensions.crypt(trim(p_passcode), account.passcode_hash)
  limit 1;
end;
$$;

grant execute on function public.verify_app_account(text, text) to anon, authenticated;

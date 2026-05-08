-- Run this once in Supabase SQL Editor to create or reset the ChemDeck dev login.
-- Login in the app with:
--   Username: chemdeck.dev
--   Passcode: 20260508

create extension if not exists pgcrypto with schema extensions;

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
  'chemdeck.dev',
  extensions.crypt('20260508', extensions.gen_salt('bf')),
  'manager',
  null,
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

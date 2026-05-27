-- Email invite links replace shared company codes for joining a workspace.
-- Run in Supabase SQL Editor.

create table if not exists public.company_invites (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  email text not null,
  token text not null unique,
  invited_role text not null default 'guard',
  status text not null default 'pending',
  created_by uuid,
  accepted_by uuid,
  accepted_at timestamptz,
  expires_at timestamptz not null default (now() + interval '14 days'),
  created_at timestamptz not null default now(),
  constraint company_invites_status_check check (
    lower(status) in ('pending', 'accepted', 'revoked', 'expired')
  ),
  constraint company_invites_role_check check (
    lower(invited_role) in ('guard', 'supervisor', 'manager')
  )
);

create index if not exists company_invites_company_status_idx
  on public.company_invites (company_id, lower(status));

create index if not exists company_invites_email_idx
  on public.company_invites (lower(email));

alter table public.company_invites enable row level security;

-- Expand workplace roles if the older company schema is still in place.
do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'users_role_check'
      and conrelid = 'public.users'::regclass
  ) then
    alter table public.users drop constraint users_role_check;
  end if;

  alter table public.users
    add constraint users_role_check check (
      lower(role) in ('boss', 'guard', 'dev', 'manager', 'supervisor', 'worker', 'lifeguard')
    );
exception
  when duplicate_object then null;
end $$;

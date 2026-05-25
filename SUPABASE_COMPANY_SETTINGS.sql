-- Run in Supabase SQL Editor: company settings, announcements, log photo storage

alter table public.companies
  add column if not exists settings jsonb not null default '{}'::jsonb;

create table if not exists public.announcements (
  id uuid primary key default extensions.gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null,
  message text not null,
  priority text not null default 'normal',
  audience text not null default 'all_lifeguards',
  pool_id uuid references public.pools(id) on delete set null,
  created_by uuid,
  send_notification boolean not null default true,
  require_acknowledgment boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists announcements_company_id_idx on public.announcements(company_id);
create index if not exists announcements_created_at_idx on public.announcements(created_at desc);

create table if not exists public.announcement_acknowledgments (
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  user_id uuid not null,
  acknowledged_at timestamptz not null default now(),
  primary key (announcement_id, user_id)
);

insert into storage.buckets (id, name, public)
values ('log-photos', 'log-photos', true)
on conflict (id) do update set public = excluded.public;

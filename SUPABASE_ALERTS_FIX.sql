-- ChemDeck alerts table — run this ENTIRE file in Supabase SQL Editor (New query → paste all → Run)
-- Fixes: ERROR 42703 column "company_id" does not exist

drop table if exists public.alerts cascade;

create table public.alerts (
  id uuid primary key default extensions.gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  pool_id uuid references public.pools(id) on delete set null,
  chemical_log_id uuid references public.chemical_logs(id) on delete set null,
  severity text not null default 'warning',
  alert_type text not null,
  title text not null,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index alerts_company_id_idx on public.alerts(company_id);
create index alerts_created_at_idx on public.alerts(created_at desc);
create index alerts_unread_idx on public.alerts(company_id, read_at);

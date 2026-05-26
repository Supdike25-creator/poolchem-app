-- =============================================================================
-- ChemDeck: FIX alerts "company_id does not exist" (run ENTIRE file)
-- Supabase SQL Editor → New query → Cmd+A → Run
-- =============================================================================

-- Legacy installs sometimes have alerts as a VIEW, not a table.
-- DROP TABLE alone will NOT remove a view — that causes the company_id error.
drop table if exists public.alerts cascade;

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
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

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'alerts'
      and column_name = 'company_id'
  ) then
    raise exception 'Alerts migration failed: public.alerts still has no company_id column.';
  end if;
end $$;

create index if not exists alerts_company_id_idx on public.alerts(company_id);
create index if not exists alerts_created_at_idx on public.alerts(created_at desc);
create index if not exists alerts_unread_idx on public.alerts(company_id, read_at);

select 'alerts table OK' as status, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'alerts'
order by ordinal_position;

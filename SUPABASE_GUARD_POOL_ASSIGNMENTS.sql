-- Run in Supabase SQL Editor: guard pool assignments

create table if not exists public.guard_pool_assignments (
  id uuid primary key default extensions.gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  guard_id uuid not null,
  pool_id uuid not null references public.pools(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  unique (guard_id, pool_id)
);

create index if not exists guard_pool_assignments_company_idx
  on public.guard_pool_assignments(company_id);

create index if not exists guard_pool_assignments_guard_idx
  on public.guard_pool_assignments(guard_id);

create index if not exists guard_pool_assignments_pool_idx
  on public.guard_pool_assignments(pool_id);

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.companies (
  id uuid primary key default extensions.gen_random_uuid(),
  company_name text not null,
  company_code text not null unique,
  created_by uuid,
  created_at timestamptz not null default now()
);

alter table public.companies
  add column if not exists company_name text,
  add column if not exists company_code text,
  add column if not exists created_by uuid,
  add column if not exists created_at timestamptz not null default now();

create unique index if not exists companies_company_code_unique_idx
on public.companies (company_code);

create index if not exists companies_created_by_idx
on public.companies (created_by);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'companies_created_by_fkey'
      and conrelid = 'public.companies'::regclass
  ) then
    alter table public.companies
      add constraint companies_created_by_fkey
      foreign key (created_by)
      references auth.users(id)
      on delete set null;
  end if;
end $$;

insert into public.companies (company_name, company_code, created_by)
values (
  'Default Company',
  '12345',
  (
    select p.id
    from public.profiles p
    where lower(p.role) in ('boss', 'manager', 'admin', 'supervisor', 'owner', 'dev')
    order by case when lower(p.role) in ('boss', 'manager', 'admin', 'supervisor', 'owner') then 0 else 1 end
    limit 1
  )
)
on conflict (company_code) do update
set company_name = excluded.company_name,
    created_by = coalesce(public.companies.created_by, excluded.created_by)
returning id as company_id, company_name, company_code, created_by;

-- Optional: assign every existing non-dev account to company code 12345.
-- Uncomment and run this block only if you want all existing worker/boss accounts attached now.
--
-- update public.profiles
-- set company_id = (select id from public.companies where company_code = '12345'),
--     status = 'active',
--     active = true
-- where lower(coalesce(role, 'worker')) <> 'dev';
--
-- update public.users
-- set company_id = (select id from public.companies where company_code = '12345'),
--     status = 'active',
--     active = true
-- where lower(coalesce(role, 'worker')) <> 'dev';
--
-- update public.app_accounts
-- set company_id = (select id from public.companies where company_code = '12345'),
--     status = 'active',
--     active = true
-- where lower(coalesce(role, 'worker')) <> 'dev';

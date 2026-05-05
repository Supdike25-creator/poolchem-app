-- Create organizations table
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company_code text unique not null,
  created_by uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

-- Create profiles table
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid references organizations(id) on delete cascade,
  full_name text,
  email text,
  role text check (role in ('manager','supervisor','lifeguard','admin')) default 'lifeguard',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create pools table (if not exists)
create table if not exists pools (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  volume_gallons numeric,
  pool_type text,
  is_baby_pool boolean default false,
  target_chlorine_min numeric,
  target_chlorine_max numeric,
  target_ph_min numeric,
  target_ph_max numeric,
  default_chlorine_type text,
  default_chlorine_strength numeric,
  max_single_dose_oz numeric,
  retest_minutes integer,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create chemical_logs table (if not exists)
create table if not exists chemical_logs (
  id uuid primary key default gen_random_uuid(),
  pool_id uuid not null references pools(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  chemical_type text not null,
  amount numeric not null,
  unit text not null,
  notes text,
  logged_at timestamptz not null default now(),
  created_at timestamptz default now()
);

-- Enable RLS
alter table organizations enable row level security;
alter table profiles enable row level security;
alter table pools enable row level security;
alter table chemical_logs enable row level security;

-- Organizations policies
create policy "Users can insert organizations they create" on organizations
  for insert with check (auth.uid() = created_by);

create policy "Users can read organizations they created" on organizations
  for select using (auth.uid() = created_by);

create policy "Users can read organizations they belong to" on organizations
  for select using (
    id in (
      select organization_id from profiles
      where id = auth.uid()
    )
  );

create policy "Users can read organizations by company_code during join" on organizations
  for select using (true);

-- Profiles policies
create policy "Users can insert their own profile" on profiles
  for insert with check (auth.uid() = id);

create policy "Users can read their own profile" on profiles
  for select using (auth.uid() = id);

create policy "Users can update their own profile" on profiles
  for update using (auth.uid() = id);

create policy "Managers can read profiles in their organization" on profiles
  for select using (
    organization_id in (
      select organization_id from profiles
      where id = auth.uid() and role in ('manager', 'admin')
    )
  );

-- Pools policies
create policy "Users can read pools from their organization" on pools
  for select using (
    organization_id in (
      select organization_id from profiles
      where id = auth.uid()
    )
  );

create policy "Users can insert pools for their organization" on pools
  for insert with check (
    organization_id in (
      select organization_id from profiles
      where id = auth.uid()
    )
  );

create policy "Users can update pools from their organization" on pools
  for update using (
    organization_id in (
      select organization_id from profiles
      where id = auth.uid()
    )
  );

create policy "Users can delete pools from their organization" on pools
  for delete using (
    organization_id in (
      select organization_id from profiles
      where id = auth.uid()
    )
  );

-- Chemical logs policies
create policy "Users can read chemical logs from their organization pools" on chemical_logs
  for select using (
    pool_id in (
      select id from pools
      where organization_id in (
        select organization_id from profiles
        where id = auth.uid()
      )
    )
  );

create policy "Users can insert chemical logs for their organization pools" on chemical_logs
  for insert with check (
    pool_id in (
      select id from pools
      where organization_id in (
        select organization_id from profiles
        where id = auth.uid()
      )
    ) and auth.uid() = user_id
  );
  );

create policy "Users can update pools from their organization" on pools
  for update using (
    organization_id in (
      select organization_id from profiles
      where id = auth.uid()
    )
  );

create policy "Users can delete pools from their organization" on pools
  for delete using (
    organization_id in (
      select organization_id from profiles
      where id = auth.uid()
    )
  );

-- Chemical logs policies
create policy "Users can read chemical logs from their organization pools" on chemical_logs
  for select using (
    pool_id in (
      select id from pools
      where organization_id in (
        select organization_id from profiles
        where id = auth.uid()
      )
    )
  );

create policy "Users can insert chemical logs for their organization pools" on chemical_logs
  for insert with check (
    pool_id in (
      select id from pools
      where organization_id in (
        select organization_id from profiles
        where id = auth.uid()
      )
    ) and auth.uid() = user_id
  );

-- Create indexes for better performance
create index if not exists idx_organizations_company_code on organizations(company_code);
create index if not exists idx_profiles_organization_id on profiles(organization_id);
create index if not exists idx_pools_organization_id on pools(organization_id);
create index if not exists idx_chemical_logs_pool_id on chemical_logs(pool_id);
create index if not exists idx_chemical_logs_user_id on chemical_logs(user_id);
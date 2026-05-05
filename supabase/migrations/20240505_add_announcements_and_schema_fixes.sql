-- Migration: Add announcements table and ensure schema completeness
-- Run this after the initial organization schema migration

-- Create announcements table
create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  title text not null,
  message text not null,
  priority text default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  audience text default 'all_lifeguards' check (audience in ('all_lifeguards', 'managers_only', 'supervisors_only')),
  pool_id uuid nullable references pools(id) on delete set null,
  created_by uuid not null references auth.users(id),
  send_notification boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS on announcements
alter table announcements enable row level security;

-- Announcements policies
create policy "Users can read announcements from their organization" on announcements
  for select using (
    organization_id in (
      select organization_id from profiles
      where id = auth.uid()
    )
  );

create policy "Managers can create announcements for their organization" on announcements
  for insert with check (
    organization_id in (
      select organization_id from profiles
      where id = auth.uid()
    ) and exists (
      select 1 from profiles
      where id = auth.uid() and role in ('manager', 'admin')
    )
  );

create policy "Managers can update their own announcements" on announcements
  for update using (
    created_by = auth.uid() and exists (
      select 1 from profiles
      where id = auth.uid() and role in ('manager', 'admin')
    )
  );

create policy "Managers can delete their own announcements" on announcements
  for delete using (
    created_by = auth.uid() and exists (
      select 1 from profiles
      where id = auth.uid() and role in ('manager', 'admin')
    )
  );

-- Add indexes for announcements
create index if not exists idx_announcements_organization_id on announcements(organization_id);
create index if not exists idx_announcements_created_by on announcements(created_by);
create index if not exists idx_announcements_pool_id on announcements(pool_id);
create index if not exists idx_announcements_created_at on announcements(created_at desc);

-- Ensure profiles.email column exists (it should already exist from the initial migration)
-- If it doesn't exist, this will add it
do $$
begin
  if not exists (select 1 from information_schema.columns
                 where table_name = 'profiles' and column_name = 'email') then
    alter table profiles add column email text;
  end if;
end $$;

-- Update existing profiles to populate email if missing
update profiles
set email = auth.users.email
from auth.users
where profiles.id = auth.users.id and profiles.email is null;
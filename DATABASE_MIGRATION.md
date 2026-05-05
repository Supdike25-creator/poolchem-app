# ChemDeck Database Migration

## Setup Instructions

1. **Run the Database Migration**
   Execute the SQL migration file in your Supabase database:
   ```sql
   -- Run the contents of: supabase/migrations/20240504_create_organization_schema.sql
   ```

2. **Verify Tables Created**
   Check that these tables exist in your Supabase database:
   - `organizations`
   - `profiles`
   - `pools`
   - `chemical_logs`

3. **Verify RLS Policies**
   Ensure Row Level Security is enabled and policies are active for all tables.

## Database Schema

### Organizations Table
- `id` (uuid, primary key)
- `name` (text, not null)
- `company_code` (text, unique, not null)
- `created_by` (uuid, references auth.users)
- `created_at` (timestamptz, default now)

### Profiles Table
- `id` (uuid, primary key, references auth.users)
- `organization_id` (uuid, references organizations)
- `full_name` (text)
- `email` (text)
- `role` (text, check constraint: 'manager','supervisor','lifeguard','admin')
- `created_at` (timestamptz, default now)
- `updated_at` (timestamptz, default now)

### Pools Table
- `id` (uuid, primary key)
- `organization_id` (uuid, not null, references organizations)
- `name` (text, not null)
- `volume_gallons` (numeric)
- `pool_type` (text)
- `is_baby_pool` (boolean, default false)
- Additional pool configuration fields...

### Chemical Logs Table
- `id` (uuid, primary key)
- `pool_id` (uuid, not null, references pools)
- `user_id` (uuid, not null, references auth.users)
- `chemical_type` (text, not null)
- `amount` (numeric, not null)
- `unit` (text, not null)
- `notes` (text)
- `logged_at` (timestamptz, not null, default now)
- `created_at` (timestamptz, default now)

### Announcements Table
- `id` (uuid, primary key, default gen_random_uuid)
- `organization_id` (uuid, not null, references organizations)
- `title` (text, not null)
- `message` (text, not null)
- `priority` (text, default 'normal', check in ('low', 'normal', 'high', 'urgent'))
- `audience` (text, default 'all_lifeguards', check in ('all_lifeguards', 'managers_only', 'supervisors_only'))
- `pool_id` (uuid, nullable, references pools)
- `created_by` (uuid, not null, references auth.users)
- `send_notification` (boolean, default true)
- `created_at` (timestamptz, default now)
- `updated_at` (timestamptz, default now)

## RLS Policies

### Organizations
- Users can insert organizations they create (`auth.uid() = created_by`)
- Users can read organizations they created
- Users can read organizations they belong to (via profiles table)

### Profiles
- Users can insert their own profile (`auth.uid() = id`)
- Users can update their own profile
- Users can read their own profile

### Pools
- Users can read/update/delete pools from their organization
- Users can insert pools for their organization

### Chemical Logs
- Users can read logs from their organization pools
- Users can insert logs for their organization pools (and must be the user_id)

### Announcements
- Users can read announcements from their organization
- Managers can create/update/delete announcements for their organization

## Onboarding Flow

1. **New User Signs In** → Redirected to `/onboarding/company`
2. **Create Company** → Generates company code, creates organization, sets user role to 'manager'
3. **Join Company** → Uses company code, joins organization, sets user role to 'lifeguard'
4. **After Onboarding** → Redirected to appropriate dashboard based on role

## Role Mapping

Database roles are mapped to app roles:
- `'manager'`, `'supervisor'`, `'admin'` → `'manager'` (app role)
- `'lifeguard'` → `'guard'` (app role)

## Troubleshooting

If you encounter errors during onboarding:

1. Check browser console for detailed Supabase error messages
2. Verify RLS policies are enabled
3. Ensure user is authenticated before accessing onboarding
4. Check that database migration was applied correctly
5. Verify company codes are unique and properly formatted
-- Remove single-organization column and add has_org boolean
ALTER TABLE public.profiles DROP COLUMN IF EXISTS organization_id;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS has_org boolean NOT NULL DEFAULT false;

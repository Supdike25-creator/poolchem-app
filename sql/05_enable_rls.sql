-- Enable Row Level Security on the new tables
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_organizations ENABLE ROW LEVEL SECURITY;

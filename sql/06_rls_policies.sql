-- RLS policies for organization_members
-- Admins (in admin_organizations) can read/write members in their orgs
CREATE POLICY org_members_admin_access
  ON public.organization_members
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_organizations ao
      WHERE ao.admin_id::text = auth.uid() AND ao.organization_id = public.organization_members.organization_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_organizations ao
      WHERE ao.admin_id::text = auth.uid() AND ao.organization_id = public.organization_members.organization_id
    )
  );

-- Members can read their own rows
CREATE POLICY org_members_self_select
  ON public.organization_members
  FOR SELECT
  USING (
    user_id IS NOT NULL AND user_id::text = auth.uid()
  );

-- Members can update their own row (e.g., accept/join)
CREATE POLICY org_members_self_update
  ON public.organization_members
  FOR UPDATE
  USING (
    user_id IS NOT NULL AND user_id::text = auth.uid()
  )
  WITH CHECK (
    user_id IS NOT NULL AND user_id::text = auth.uid()
  );

-- RLS policies for invites
-- Admins can select invites for their orgs
CREATE POLICY invites_admin_select
  ON public.invites
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_organizations ao
      WHERE ao.admin_id::text = auth.uid() AND ao.organization_id = public.invites.organization_id
    )
  );

-- Admins can insert invites for their orgs
CREATE POLICY invites_admin_insert
  ON public.invites
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_organizations ao
      WHERE ao.admin_id::text = auth.uid() AND ao.organization_id = public.invites.organization_id
    )
  );

-- RLS policies for admin_organizations
-- Admins can read their own admin_organizations rows
CREATE POLICY admin_orgs_select_own
  ON public.admin_organizations
  FOR SELECT
  USING (
    admin_id::text = auth.uid()
  );

-- Allow admins to insert mapping only for themselves
CREATE POLICY admin_orgs_insert_own
  ON public.admin_organizations
  FOR INSERT
  WITH CHECK (
    admin_id::text = auth.uid()
  );

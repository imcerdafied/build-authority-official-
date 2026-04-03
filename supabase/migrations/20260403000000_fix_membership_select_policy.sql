-- Fix: Add direct "users can see own memberships" policy.
-- The existing policy uses is_org_member() which creates a circular dependency:
-- to SELECT your membership rows, you must be verified as a member by querying
-- the same table. While SECURITY DEFINER resolves this at the SQL level, it
-- causes intermittent failures with PostgREST session propagation timing.
--
-- This adds a simple, direct policy: users can always see rows where user_id = auth.uid().
-- The existing is_org_member policy is kept for admin/cross-org visibility.

DROP POLICY IF EXISTS "Users can view own memberships" ON public.organization_memberships;
CREATE POLICY "Users can view own memberships"
ON public.organization_memberships
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

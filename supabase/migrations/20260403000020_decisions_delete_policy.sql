-- Add explicit DELETE policy for decisions table.
-- Only admins can delete decisions. This was previously an implicit deny
-- (no DELETE policy = RLS blocks all deletes), now made explicit.

DROP POLICY IF EXISTS "Admins can delete decisions" ON public.decisions;
CREATE POLICY "Admins can delete decisions"
ON public.decisions
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.organization_memberships om
    WHERE om.org_id = decisions.org_id
      AND om.user_id = auth.uid()
      AND om.role = 'admin'
  )
);

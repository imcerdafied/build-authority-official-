-- Domain-based join flow: let users request access to an existing workspace
-- when their email domain matches allowed_email_domain.

-- ---------------------------------------------------------------------------
-- Table: org_join_requests
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.org_join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'denied')),
  created_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id),
  UNIQUE (org_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_join_requests_org_status
  ON public.org_join_requests(org_id, status);
CREATE INDEX IF NOT EXISTS idx_join_requests_user
  ON public.org_join_requests(user_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.org_join_requests ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='org_join_requests' AND policyname='Users see own join requests') THEN
    CREATE POLICY "Users see own join requests" ON public.org_join_requests
      FOR SELECT TO authenticated USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='org_join_requests' AND policyname='Admins manage join requests') THEN
    CREATE POLICY "Admins manage join requests" ON public.org_join_requests
      FOR ALL TO authenticated USING (public.is_admin_of_org(auth.uid(), org_id));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- RPC: find_org_by_email_domain
-- Returns a workspace (if any) that auto-accepts the given domain.
-- Security definer so pre-membership users can read it.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.find_org_by_email_domain(p_domain text)
RETURNS TABLE(id uuid, name text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, name
  FROM public.organizations
  WHERE allowed_email_domain IS NOT NULL
    AND lower(allowed_email_domain) = lower(p_domain)
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.find_org_by_email_domain(text) TO authenticated;

-- ---------------------------------------------------------------------------
-- RPC: request_to_join_org
-- Caller: authenticated user whose email domain matches the org's configured
-- domain. Creates or refreshes a pending request.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.request_to_join_org(p_org_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_email text;
  v_domain text;
  v_org_domain text;
  v_request_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  -- Already a member? No-op.
  IF EXISTS (
    SELECT 1 FROM public.organization_memberships
    WHERE org_id = p_org_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Already a member of this workspace' USING ERRCODE = '23505';
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;
  v_domain := split_part(v_email, '@', 2);

  SELECT allowed_email_domain INTO v_org_domain
  FROM public.organizations WHERE id = p_org_id;

  IF v_org_domain IS NULL OR lower(v_org_domain) != lower(v_domain) THEN
    RAISE EXCEPTION 'Email domain does not match workspace configuration' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.org_join_requests (org_id, user_id, email, status)
  VALUES (p_org_id, v_user_id, v_email, 'pending')
  ON CONFLICT (org_id, user_id) DO UPDATE
    SET status = 'pending',
        created_at = now(),
        reviewed_at = NULL,
        reviewed_by = NULL
  RETURNING id INTO v_request_id;

  RETURN v_request_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_to_join_org(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- RPC: approve_join_request
-- Admin-only. Adds a membership, marks request approved.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.approve_join_request(p_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_user_id uuid;
BEGIN
  SELECT org_id, user_id INTO v_org_id, v_user_id
  FROM public.org_join_requests
  WHERE id = p_request_id AND status = 'pending';

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Join request not found or already reviewed' USING ERRCODE = '42704';
  END IF;

  IF NOT public.is_admin_of_org(auth.uid(), v_org_id) THEN
    RAISE EXCEPTION 'Only admins can approve join requests' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.organization_memberships (org_id, user_id, role)
  VALUES (v_org_id, v_user_id, 'viewer')
  ON CONFLICT DO NOTHING;

  UPDATE public.org_join_requests
  SET status = 'approved',
      reviewed_at = now(),
      reviewed_by = auth.uid()
  WHERE id = p_request_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_join_request(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- RPC: deny_join_request
-- Admin-only. Marks the request denied without adding membership.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.deny_join_request(p_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  SELECT org_id INTO v_org_id
  FROM public.org_join_requests
  WHERE id = p_request_id AND status = 'pending';

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Join request not found or already reviewed' USING ERRCODE = '42704';
  END IF;

  IF NOT public.is_admin_of_org(auth.uid(), v_org_id) THEN
    RAISE EXCEPTION 'Only admins can deny join requests' USING ERRCODE = '42501';
  END IF;

  UPDATE public.org_join_requests
  SET status = 'denied',
      reviewed_at = now(),
      reviewed_by = auth.uid()
  WHERE id = p_request_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.deny_join_request(uuid) TO authenticated;

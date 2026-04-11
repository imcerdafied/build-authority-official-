-- New table for org-configurable solution domains
CREATE TABLE IF NOT EXISTS public.org_solution_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  label text NOT NULL,
  color text DEFAULT '#888888',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.org_solution_domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their org domains"
  ON public.org_solution_domains FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), org_id));

CREATE POLICY "Admins can manage org domains"
  ON public.org_solution_domains FOR ALL TO authenticated
  USING (public.is_admin_of_org(auth.uid(), org_id));

CREATE INDEX IF NOT EXISTS idx_org_solution_domains_org_id
  ON public.org_solution_domains(org_id);

-- Seed Conviva's existing domains so they see ZERO change
INSERT INTO public.org_solution_domains (org_id, name, label, sort_order)
VALUES
  ('aa6d6ba6-5e88-4c61-a511-234a8cea4c12', 'S1', 'S1', 1),
  ('aa6d6ba6-5e88-4c61-a511-234a8cea4c12', 'S2', 'S2', 2),
  ('aa6d6ba6-5e88-4c61-a511-234a8cea4c12', 'S3', 'S3', 3),
  ('aa6d6ba6-5e88-4c61-a511-234a8cea4c12', 'Cross', 'Cross', 4)
ON CONFLICT DO NOTHING;

-- Add parallel text columns (enum columns stay untouched)
ALTER TABLE public.decisions
  ADD COLUMN IF NOT EXISTS solution_domain_key text;

ALTER TABLE public.signals
  ADD COLUMN IF NOT EXISTS solution_domain_key text;

ALTER TABLE public.pods
  ADD COLUMN IF NOT EXISTS solution_domain_key text;

-- Backfill from existing enum values
UPDATE public.decisions SET solution_domain_key = solution_domain::text WHERE solution_domain_key IS NULL;
UPDATE public.signals SET solution_domain_key = solution_domain::text WHERE solution_domain_key IS NULL;
UPDATE public.pods SET solution_domain_key = solution_domain::text WHERE solution_domain_key IS NULL;

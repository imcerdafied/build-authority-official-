-- Goals altitude schema: OKRs, Key Results, Check-ins

-- OKRs table
CREATE TABLE IF NOT EXISTS public.okrs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  quarter text,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'on_track', 'at_risk', 'behind', 'complete', 'cancelled')),
  owner_id uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id) DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Key Results table
CREATE TABLE IF NOT EXISTS public.key_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  okr_id uuid NOT NULL REFERENCES public.okrs(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  metric_type text NOT NULL DEFAULT 'percentage'
    CHECK (metric_type IN ('percentage', 'number', 'currency', 'boolean')),
  target_value decimal,
  current_value decimal DEFAULT 0,
  unit text,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'on_track', 'at_risk', 'behind', 'complete')),
  confidence_score integer CHECK (confidence_score BETWEEN 0 AND 10),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Check-ins / progress updates
CREATE TABLE IF NOT EXISTS public.okr_check_ins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_result_id uuid NOT NULL REFERENCES public.key_results(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  value decimal NOT NULL,
  confidence_score integer CHECK (confidence_score BETWEEN 0 AND 10),
  notes text,
  created_by uuid REFERENCES auth.users(id) DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.okrs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.key_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.okr_check_ins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage okrs"
  ON public.okrs FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), org_id));

CREATE POLICY "Org members can manage key_results"
  ON public.key_results FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), org_id));

CREATE POLICY "Org members can manage okr_check_ins"
  ON public.okr_check_ins FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), org_id));

CREATE INDEX IF NOT EXISTS idx_okrs_org ON public.okrs(org_id);
CREATE INDEX IF NOT EXISTS idx_key_results_okr ON public.key_results(okr_id);
CREATE INDEX IF NOT EXISTS idx_okr_check_ins_kr ON public.okr_check_ins(key_result_id);

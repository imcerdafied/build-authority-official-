-- Build altitude schema: Outcomes and Roadmap Items

-- Outcomes table
CREATE TABLE IF NOT EXISTS public.outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned', 'in_progress', 'shipped', 'cancelled')),
  bet_id uuid REFERENCES public.decisions(id),
  owner_id uuid REFERENCES auth.users(id),
  target_date date,
  shipped_date date,
  confidence_score integer CHECK (confidence_score BETWEEN 0 AND 10),
  notes text,
  created_by uuid REFERENCES auth.users(id) DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Roadmap items table
CREATE TABLE IF NOT EXISTS public.roadmap_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned', 'in_progress', 'shipped', 'cancelled')),
  quarter text,
  bet_id uuid REFERENCES public.decisions(id),
  outcome_id uuid REFERENCES public.outcomes(id),
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage outcomes"
  ON public.outcomes FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), org_id));

CREATE POLICY "Org members can manage roadmap_items"
  ON public.roadmap_items FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), org_id));

CREATE INDEX IF NOT EXISTS idx_outcomes_org ON public.outcomes(org_id);
CREATE INDEX IF NOT EXISTS idx_outcomes_bet ON public.outcomes(bet_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_items_org ON public.roadmap_items(org_id);

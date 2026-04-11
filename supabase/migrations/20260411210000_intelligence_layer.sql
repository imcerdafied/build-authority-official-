-- Intelligence Layer Schema
-- Sources: uploaded documents for analysis
CREATE TABLE IF NOT EXISTS public.intel_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  source_type text NOT NULL DEFAULT 'text'
    CHECK (source_type IN ('text', 'pdf', 'url')),
  content text NOT NULL,
  processing_status text NOT NULL DEFAULT 'pending'
    CHECK (processing_status IN ('pending', 'analyzing', 'complete', 'failed')),
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Friction Points: user pain, market gaps, operational failures
CREATE TABLE IF NOT EXISTS public.intel_friction_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES public.intel_sources(id) ON DELETE CASCADE,
  title text NOT NULL,
  summary text NOT NULL,
  severity text NOT NULL DEFAULT 'medium'
    CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  cluster text,
  confidence_score numeric DEFAULT 0.7
    CHECK (confidence_score >= 0 AND confidence_score <= 1),
  created_at timestamptz DEFAULT now()
);

-- Insights: opportunities, patterns, strategic signals
CREATE TABLE IF NOT EXISTS public.intel_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES public.intel_sources(id) ON DELETE CASCADE,
  title text NOT NULL,
  summary text NOT NULL,
  severity text NOT NULL DEFAULT 'medium'
    CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  confidence_score numeric DEFAULT 0.7
    CHECK (confidence_score >= 0 AND confidence_score <= 1),
  created_at timestamptz DEFAULT now()
);

-- Hypotheses: scored "if we build X, we expect Y" statements
CREATE TABLE IF NOT EXISTS public.intel_hypotheses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES public.intel_sources(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  expected_impact text,
  value_score numeric DEFAULT 3 CHECK (value_score >= 1 AND value_score <= 5),
  effort_score numeric DEFAULT 3 CHECK (effort_score >= 1 AND effort_score <= 5),
  v_squared numeric GENERATED ALWAYS AS ((value_score * value_score) / effort_score) STORED,
  confidence_score numeric DEFAULT 0.5
    CHECK (confidence_score >= 0 AND confidence_score <= 1),
  promoted_to_roadmap boolean DEFAULT false,
  promoted_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- RLS policies
ALTER TABLE public.intel_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intel_friction_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intel_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intel_hypotheses ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='intel_sources' AND policyname='Org members can manage intel_sources') THEN
    CREATE POLICY "Org members can manage intel_sources" ON public.intel_sources
      FOR ALL TO authenticated USING (public.is_org_member(auth.uid(), org_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='intel_friction_points' AND policyname='Org members can manage intel_friction_points') THEN
    CREATE POLICY "Org members can manage intel_friction_points" ON public.intel_friction_points
      FOR ALL TO authenticated USING (public.is_org_member(auth.uid(), org_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='intel_insights' AND policyname='Org members can manage intel_insights') THEN
    CREATE POLICY "Org members can manage intel_insights" ON public.intel_insights
      FOR ALL TO authenticated USING (public.is_org_member(auth.uid(), org_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='intel_hypotheses' AND policyname='Org members can manage intel_hypotheses') THEN
    CREATE POLICY "Org members can manage intel_hypotheses" ON public.intel_hypotheses
      FOR ALL TO authenticated USING (public.is_org_member(auth.uid(), org_id));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_intel_sources_org ON public.intel_sources(org_id);
CREATE INDEX IF NOT EXISTS idx_intel_friction_org ON public.intel_friction_points(org_id);
CREATE INDEX IF NOT EXISTS idx_intel_insights_org ON public.intel_insights(org_id);
CREATE INDEX IF NOT EXISTS idx_intel_hypotheses_org ON public.intel_hypotheses(org_id);
CREATE INDEX IF NOT EXISTS idx_intel_hypotheses_source ON public.intel_hypotheses(source_id);

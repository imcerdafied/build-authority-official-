-- Phunware launch bets
-- Run against production Supabase via SQL Editor
-- Prerequisite: "Phunware" workspace must already exist

BEGIN;

-- Configure Phunware workspace product areas and outcome categories
WITH target_org AS (
  SELECT id
  FROM public.organizations
  WHERE lower(name) = lower('Phunware')
  LIMIT 1
)
UPDATE public.organizations o
SET
  product_areas = jsonb_build_array(
    jsonb_build_object('key', 'S1', 'label', 'Platform Core'),
    jsonb_build_object('key', 'S2', 'label', 'Location Services'),
    jsonb_build_object('key', 'S3', 'label', 'Enterprise Control Plane'),
    jsonb_build_object('key', 'S4', 'label', 'Healthcare Vertical'),
    jsonb_build_object('key', 'S5', 'label', 'Platform & Ecosystem')
  ),
  custom_outcome_categories = jsonb_build_array(
    jsonb_build_object('key', 'revenue_growth', 'label', 'Revenue Growth'),
    jsonb_build_object('key', 'platform_adoption', 'label', 'Platform Adoption'),
    jsonb_build_object('key', 'market_expansion', 'label', 'Market Expansion'),
    jsonb_build_object('key', 'customer_retention', 'label', 'Customer Retention'),
    jsonb_build_object('key', 'ecosystem_growth', 'label', 'Ecosystem Growth')
  )
WHERE o.id IN (SELECT id FROM target_org);

-- Ensure outcome category keys exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'outcome_categories'
  ) THEN
    INSERT INTO public.outcome_categories (key, label)
    VALUES
      ('revenue_growth', 'Revenue Growth'),
      ('platform_adoption', 'Platform Adoption'),
      ('market_expansion', 'Market Expansion'),
      ('customer_retention', 'Customer Retention'),
      ('ecosystem_growth', 'Ecosystem Growth')
    ON CONFLICT (key) DO UPDATE
    SET label = EXCLUDED.label;
  END IF;
END
$$;

-- Insert Phunware bets (idempotent by title within org)
WITH target_org AS (
  SELECT id
  FROM public.organizations
  WHERE lower(name) = lower('Phunware')
  LIMIT 1
),
seed_rows AS (
  SELECT *
  FROM (
    VALUES
      (
        'Replatform MaaS on AI-Native Engagement Engine',
        'CTO (incoming)',
        'MC',
        'Platform Core',
        'S1',
        'revenue_growth',
        'GA release of AI-augmented MaaS SDK within 6 months',
        'Repositions PHUN from legacy mobile middleware to AI-native engagement — opens new enterprise pipeline',
        'Full existing MaaS install base at migration risk if platform stagnates',
        'Current MaaS ARR (TBD via diligence)',
        'Existing SDK customers asking for AI capabilities; competitive platforms shipping them'
      ),
      (
        'Launch Location Intelligence as Standalone Product',
        'Head of Product (incoming)',
        'MC',
        'Location Services',
        'S2',
        'revenue_growth',
        'First standalone location-intelligence customer signed within 9 months',
        'Unbundles Phunware''s strongest technical asset from the full MaaS stack — creates a wedge product for new verticals (retail, logistics, healthcare campuses)',
        '$1-3M addressable in first year (location analytics market)',
        '$0 (new product line)',
        'Diligence confirms location/wayfinding tech is differentiated and extractable from monolith'
      ),
      (
        'Ship Enterprise Admin & Analytics Console',
        'CTO',
        'MC',
        'Enterprise Control Plane',
        'S3',
        'revenue_growth',
        'Self-serve dashboard live for top 5 customers within 4 months',
        'Reduces churn, increases expansion — customers who see their own data renew at higher rates and buy more seats',
        'Retention of current top-5 accounts',
        'Concentrated ARR from top accounts',
        'Customer support tickets showing "how do I see my data" patterns; renewal conversations going sideways'
      ),
      (
        'Build Vertical Solution for Healthcare (Wayfinding + Engagement)',
        'Head of Product',
        'MC',
        'Healthcare Vertical',
        'S4',
        'revenue_growth',
        'Signed pilot with one health system within 9 months',
        'Proves repeatable vertical go-to-market — healthcare has budget, regulatory need, and high switching costs',
        '$500K-$2M TCV per health system',
        '$0 (greenfield)',
        'Diligence reveals existing healthcare customer or warm pipeline; CMS/HIPAA compliance requirements create defensible moat'
      ),
      (
        'Open API / Developer Ecosystem Play',
        'CTO',
        'MC',
        'Platform & Ecosystem',
        'S5',
        'revenue_growth',
        'Public API docs + developer sandbox live within 6 months; 10 external integrations within 12',
        'Shifts PHUN from services-heavy delivery to platform-led growth — third parties build on top, reducing PHUN''s cost to serve',
        'Platform multiplier on existing ARR',
        '$0 (but accelerates all other bets)',
        'Sales cycles stalling because customers need integrations PHUN can''t staff; SI partners asking for API access'
      )
  ) AS t(
    title,
    owner,
    sponsor,
    product_area,
    solution_domain,
    outcome_category_key,
    outcome_target,
    expected_impact,
    exposure_value,
    revenue_at_risk,
    trigger_signal
  )
)
INSERT INTO public.decisions (
  org_id,
  title,
  owner,
  sponsor,
  surface,
  solution_domain,
  impact_tier,
  status,
  risk_level,
  outcome_category_key,
  outcome_target,
  expected_impact,
  exposure_value,
  revenue_at_risk,
  trigger_signal
)
SELECT
  o.id,
  s.title,
  s.owner,
  s.sponsor,
  s.product_area,
  s.solution_domain::public.solution_domain,
  'High',
  'defined',
  'healthy',
  s.outcome_category_key,
  s.outcome_target,
  s.expected_impact,
  s.exposure_value,
  s.revenue_at_risk,
  s.trigger_signal
FROM seed_rows s, target_org o
WHERE NOT EXISTS (
  SELECT 1
  FROM public.decisions d
  WHERE d.org_id = o.id
    AND d.title = s.title
);

COMMIT;

-- Verification
SELECT
  d.title,
  d.surface AS product_area,
  d.owner,
  d.sponsor,
  d.outcome_category_key,
  d.status::text
FROM public.decisions d
JOIN public.organizations o ON o.id = d.org_id
WHERE lower(o.name) = lower('Phunware')
ORDER BY d.created_at ASC;

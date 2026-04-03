-- Bulk update initiative scores in a single round-trip instead of N+1 individual UPDATEs.
-- Called from recalculateBetState after scoring and ranking.

CREATE OR REPLACE FUNCTION public.bulk_update_initiative_scores(
  updates jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.bet_initiatives AS bi
  SET
    outcome_multiplier = (u.value->>'outcome_multiplier')::double precision,
    score_v3 = (u.value->>'score_v3')::double precision,
    roadmap_position = (u.value->>'roadmap_position')::integer,
    last_score_delta = (u.value->>'last_score_delta')::double precision,
    updated_at = now()
  FROM jsonb_each(updates) AS u(key, value)
  WHERE bi.id = u.key::uuid;
END;
$$;

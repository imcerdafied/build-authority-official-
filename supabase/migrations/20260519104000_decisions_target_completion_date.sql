-- Split the dual-purpose slice_due_at into two fields:
--   slice_due_at           — the short 10-day decision-gate cycle that resets
--                            on every lifecycle transition (existing behavior)
--   target_completion_date — the long-term target deadline for the whole bet
--                            (the v6 "Timeline" value)
--
-- target_completion_date is nullable; bets without a target stay quiet.

ALTER TABLE public.decisions
  ADD COLUMN IF NOT EXISTS target_completion_date timestamptz;

COMMENT ON COLUMN public.decisions.target_completion_date IS
  'Long-term target deadline for the bet to complete (distinct from the short slice_due_at decision-gate cycle).';

NOTIFY pgrst, 'reload schema';

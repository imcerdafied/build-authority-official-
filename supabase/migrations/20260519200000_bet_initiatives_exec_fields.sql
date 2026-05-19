-- Exec-readout fields on bet_initiatives.
--
-- The table already carries RICE-style prioritization (value, confidence,
-- effort, score_v3, outcome_multiplier) that drives the outcome-scoring
-- engine. For an executive view of "what is the team actually doing to
-- support this bet," that machinery is too tactical — execs need an owner
-- and a coarse status, not a slider.
--
-- Both fields are nullable so existing rows (33 in production today across
-- Beta Ventures / Conviva / Acme) stay valid. The status string is
-- intentionally not a CHECK constraint or enum — the app validates the
-- four values (proposed / active / shipped / paused) and degrading to
-- free-text in the DB lets us evolve the vocabulary without a migration.

ALTER TABLE public.bet_initiatives
  ADD COLUMN IF NOT EXISTS owner text,
  ADD COLUMN IF NOT EXISTS status text;

COMMENT ON COLUMN public.bet_initiatives.owner IS
  'Person accountable for this initiative (free-text, surfaced in the exec view on the bet detail page).';
COMMENT ON COLUMN public.bet_initiatives.status IS
  'Coarse execution status — one of: proposed, active, shipped, paused. NULL is treated as "active" in the UI.';

NOTIFY pgrst, 'reload schema';

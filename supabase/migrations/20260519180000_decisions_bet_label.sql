-- Optional per-bet display label that overrides the portfolio's running index.
-- Lets a workspace surface "2A" / "2B" for a split bet without renaming the
-- underlying record's title or fudging created_at. Nullable: most bets render
-- with their natural sequential index. Only bets that depart from sequence
-- (or want a specific letter suffix) set this.

ALTER TABLE public.decisions
  ADD COLUMN IF NOT EXISTS bet_label text;

COMMENT ON COLUMN public.decisions.bet_label IS
  'Display label for the bet in portfolio lists (e.g. "2A"). NULL means render the computed sequential index.';

NOTIFY pgrst, 'reload schema';

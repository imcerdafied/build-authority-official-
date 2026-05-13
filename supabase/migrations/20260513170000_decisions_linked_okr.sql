-- Link bets (decisions) to goals (okrs)
-- Nullable: existing bets stay unlinked and surface a GOAL_MISSING warning in the UI.
-- New bets are required to pick a goal at creation.

ALTER TABLE public.decisions
  ADD COLUMN IF NOT EXISTS linked_okr_id uuid
  REFERENCES public.okrs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS decisions_linked_okr_id_idx
  ON public.decisions(linked_okr_id)
  WHERE linked_okr_id IS NOT NULL;

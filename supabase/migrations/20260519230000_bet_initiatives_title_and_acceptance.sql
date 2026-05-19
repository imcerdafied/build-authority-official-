-- Promote the structured fields the populate flow needs into first-class
-- columns so initiatives surface as Title / Description / Acceptance —
-- not as one blob of prose stuffed into description.
--
-- Backward-compatible: both columns nullable. Existing rows continue to
-- render their description as the headline; new rows populate title and
-- acceptance_signal explicitly and the UI prefers title over description
-- for the primary line.

ALTER TABLE public.bet_initiatives
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS acceptance_signal text;

COMMENT ON COLUMN public.bet_initiatives.title IS
  'Short workstream label rendered as the primary line on the bet detail page (preferred over description when set).';
COMMENT ON COLUMN public.bet_initiatives.acceptance_signal IS
  'Concrete deliverable / measurable outcome that closes this initiative — rendered in a separate "Acceptance" block in the exec view.';

NOTIFY pgrst, 'reload schema';

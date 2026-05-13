-- Followup to 20260513170000_decisions_linked_okr.sql
--
-- The prior migration ran `ADD COLUMN linked_okr_id uuid REFERENCES okrs(id) ON DELETE SET NULL`,
-- but in this project the inline REFERENCES clause did not produce a FK constraint.
-- (Column was created; constraint was silently absent — root cause unclear, possibly an
-- environment quirk of the migration runner.)
--
-- Without the FK, PostgREST cannot resolve the embedded join `okrs(id, title)` used by
-- the bets query, causing the Bets portfolio to render as empty even though decisions
-- exist in the database. This migration adds the constraint explicitly and force-reloads
-- the PostgREST schema cache.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.decisions'::regclass
      AND contype = 'f'
      AND pg_get_constraintdef(oid) ILIKE '%linked_okr_id%'
  ) THEN
    ALTER TABLE public.decisions
      ADD CONSTRAINT decisions_linked_okr_id_fkey
      FOREIGN KEY (linked_okr_id)
      REFERENCES public.okrs(id)
      ON DELETE SET NULL;
  END IF;
END$$;

NOTIFY pgrst, 'reload schema';

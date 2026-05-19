-- Tie initiative owners to actual auth users when possible.
--
-- The `owner` text column added in 20260519200000 works fine for free-form
-- names (clients, contractors, "TBD" placeholders), but the same human
-- typed two different ways on two different rows is invisible to the
-- system. Mirroring the pattern on `decisions` (owner text + owner_user_id
-- uuid) gives us:
--   - dropdown of workspace members in the UI
--   - live profile display_name (auto-updates on rename)
--   - text fallback when the owner isn't on the platform
--
-- ON DELETE SET NULL preserves the row when the user record is removed —
-- the snapshot in `owner` text remains as the last-known display name.

ALTER TABLE public.bet_initiatives
  ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.bet_initiatives.owner_user_id IS
  'FK to auth.users for member-backed owners. When set, UIs prefer the live profile display_name and fall back to the owner text snapshot if the user is removed.';

CREATE INDEX IF NOT EXISTS bet_initiatives_owner_user_id_idx
  ON public.bet_initiatives (owner_user_id)
  WHERE owner_user_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';

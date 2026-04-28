/*
  # Add admin-only fields to schools table

  ## Changes
  - `description` (text, nullable) — public-facing description of the school (admin-managed)
  - `internal_note` (text, nullable) — private admin note, never exposed to end users

  ## Notes
  - Both columns are nullable with no default
  - No RLS changes needed: the schools table is already restricted; these columns
    are only surfaced in the admin dashboard, not in any end-user API surface
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'schools' AND column_name = 'description'
  ) THEN
    ALTER TABLE schools ADD COLUMN description text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'schools' AND column_name = 'internal_note'
  ) THEN
    ALTER TABLE schools ADD COLUMN internal_note text;
  END IF;
END $$;

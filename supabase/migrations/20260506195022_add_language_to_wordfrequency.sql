/*
  # Add Language column to wordfrequency table

  ## Changes
  - New column `language` (text) with a CHECK constraint limiting values to
    'Dutch', 'French', 'English'
  - Default value is 'Dutch'
  - All existing rows are backfilled to 'Dutch'
*/

ALTER TABLE wordfrequency
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'Dutch'
  CONSTRAINT wordfrequency_language_check CHECK (language IN ('Dutch', 'French', 'English'));

UPDATE wordfrequency SET language = 'Dutch' WHERE language IS DISTINCT FROM 'Dutch';

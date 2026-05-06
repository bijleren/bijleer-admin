/*
  # Update language codes and add language to klankteken

  ## Changes
  1. wordfrequency.language — change CHECK constraint to use ISO codes (nl, fr, en),
     update default to 'nl', backfill all existing rows to 'nl'
  2. klankteken — add language column with the same constraint and default 'nl',
     backfill all existing rows to 'nl'
*/

-- 1. Update wordfrequency language column
ALTER TABLE wordfrequency DROP CONSTRAINT IF EXISTS wordfrequency_language_check;

ALTER TABLE wordfrequency ALTER COLUMN language SET DEFAULT 'nl';

UPDATE wordfrequency SET language = 'nl';

ALTER TABLE wordfrequency
  ADD CONSTRAINT wordfrequency_language_check CHECK (language IN ('nl', 'fr', 'en'));

-- 2. Add language to klankteken
ALTER TABLE klankteken
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'nl'
  CONSTRAINT klankteken_language_check CHECK (language IN ('nl', 'fr', 'en'));

UPDATE klankteken SET language = 'nl' WHERE language IS DISTINCT FROM 'nl';

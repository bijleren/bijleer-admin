/*
  # Add translation_id to wordfrequency

  ## Summary
  Adds a self-referencing foreign key column `translation_id` to the `wordfrequency` table.
  This links foreign-language words (e.g. French "yaourt") to their Dutch equivalent ("yoghurt")
  by storing the ID of the target Dutch word.

  ## Changes
  - `wordfrequency.translation_id` — nullable integer, FK → wordfrequency(id) ON DELETE SET NULL
    - NULL for Dutch words (no translation needed)
    - Filled in for French/English words pointing to their Dutch counterpart
*/

ALTER TABLE wordfrequency
  ADD COLUMN IF NOT EXISTS translation_id integer
  REFERENCES wordfrequency(id) ON DELETE SET NULL;

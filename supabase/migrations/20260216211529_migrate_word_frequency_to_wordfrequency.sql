/*
  # Migrate Words from word_frequency to wordfrequency
  
  ## Overview
  This migration transfers words that exist in the old `word_frequency` table but not in the 
  current `wordfrequency` table. This resolves the issue where approved words were being 
  inserted into the wrong table and not appearing in the Woordenschat page.
  
  ## Changes
  1. **Data Migration**
     - Identifies words in `word_frequency` that don't exist in `wordfrequency`
     - Inserts these words into `wordfrequency` with appropriate defaults
     - Uses frequency = 1 for all migrated words (consistent with approval flow)
     - Sets default NULL values for Dutch metadata fields (klankteken, betekenis, lidwoord)
     - These fields can be populated later through the normal word editing workflow
     - Generates sequential IDs starting from the current max ID + 1
     - Filters out empty or null words
  
  ## Safety
  - Uses WHERE NOT EXISTS to prevent duplicates
  - Safe to run multiple times (idempotent due to WHERE NOT EXISTS check)
  - Does not modify or delete existing data
  - Preserves the original word_frequency table for reference
  - Excludes invalid words (empty strings, nulls)
  
  ## Notes
  - After this migration, the application will use `wordfrequency` table exclusively
  - The `word_frequency` table will remain in place but will not be used by the application
  - Words approved through NewWords or QuickReview pages will now correctly appear in Woordenschat
*/

-- Migrate words from word_frequency to wordfrequency
-- Only insert words that don't already exist in wordfrequency
INSERT INTO wordfrequency (id, word, frequency, aantal_klankgroepen, klankteken_checked, klankteken_tobechecked, image_checked, klankgroepen_checked, forbidden, has_multiple_meanings, klankgroup_checked, onboarded, lidwoord_check)
SELECT 
  (SELECT MAX(id) FROM wordfrequency) + ROW_NUMBER() OVER (ORDER BY wf.word) as id,
  wf.word,
  1 as frequency,
  1 as aantal_klankgroepen,
  0 as klankteken_checked,
  0 as klankteken_tobechecked,
  0 as image_checked,
  0 as klankgroepen_checked,
  0 as forbidden,
  0 as has_multiple_meanings,
  0 as klankgroup_checked,
  0 as onboarded,
  0 as lidwoord_check
FROM word_frequency wf
WHERE wf.word IS NOT NULL 
  AND wf.word != ''
  AND NOT EXISTS (
    SELECT 1 
    FROM wordfrequency w 
    WHERE w.word = wf.word
  );

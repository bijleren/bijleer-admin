/*
  # Migrate category types from English to Dutch

  1. Changes
    - Drop old English-only check constraint first
    - Map existing English category types to Dutch equivalents
    - Add new check constraint with Dutch values
  
  2. Mapping
    - 'location', 'geography' → 'wereldoriëntatie' (world orientation)
    - 'math' → 'wiskunde' (mathematics)
    - 'art', 'music', 'writing' → 'kunst' (art & language)
    - 'nature', 'weather', 'time', 'body', 'animals' → 'wereldoriëntatie' (general world orientation)
  
  3. Security
    - No changes to RLS policies needed
*/

-- Drop old constraint first
ALTER TABLE vocabulary_categories 
DROP CONSTRAINT IF EXISTS vocabulary_categories_category_type_check;

-- Update existing categories to Dutch values
UPDATE vocabulary_categories 
SET category_type = CASE 
  WHEN category_type IN ('location', 'geography', 'nature', 'weather', 'time', 'body', 'animals') THEN 'wereldoriëntatie'
  WHEN category_type = 'math' THEN 'wiskunde'
  WHEN category_type IN ('art', 'music', 'writing') THEN 'kunst'
  ELSE 'wereldoriëntatie'
END
WHERE category_type IN ('location', 'nature', 'weather', 'time', 'body', 'math', 'music', 'animals', 'art', 'writing', 'geography');

-- Add new constraint with Dutch values
ALTER TABLE vocabulary_categories 
ADD CONSTRAINT vocabulary_categories_category_type_check 
CHECK (category_type = ANY (ARRAY['wereldoriëntatie'::text, 'wiskunde'::text, 'kunst'::text, 'verkeer'::text]));
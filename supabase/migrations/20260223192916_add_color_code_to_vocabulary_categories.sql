/*
  # Add color code to vocabulary categories

  1. Changes
    - Add `color_code` column to `vocabulary_categories` table
      - Stores hex color codes (e.g., #FF5733, #3498db)
      - Nullable with default null
      - Can be used for visual categorization in the UI
  
  2. Notes
    - Color codes should be in hex format (#RRGGBB)
    - Existing categories will have null color_code until updated
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vocabulary_categories' AND column_name = 'color_code'
  ) THEN
    ALTER TABLE vocabulary_categories ADD COLUMN color_code text;
  END IF;
END $$;
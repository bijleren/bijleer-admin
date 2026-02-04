/*
  # Add onboarded column to schools table

  1. Changes
    - Add `onboarded` column to `schools` table
      - Type: integer (0 or 1)
      - Default value: 0
      - Not null constraint
  
  2. Notes
    - Column will track whether a school has been onboarded
    - Standard value is 0 (not onboarded)
    - Can be edited to 1 (onboarded) through the system
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'schools' AND column_name = 'onboarded'
  ) THEN
    ALTER TABLE schools ADD COLUMN onboarded integer NOT NULL DEFAULT 0;
  END IF;
END $$;

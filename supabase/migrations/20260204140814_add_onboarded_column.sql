/*
  # Add onboarded column to wordfrequency table

  1. Changes
    - Add `onboarded` column to `wordfrequency` table
      - Type: integer (0 or 1)
      - Default value: 0
      - Not null constraint
  
  2. Notes
    - Column will track whether a word has been onboarded
    - Standard value is 0 (not onboarded)
    - Can be edited to 1 (onboarded) through the system
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wordfrequency' AND column_name = 'onboarded'
  ) THEN
    ALTER TABLE wordfrequency ADD COLUMN onboarded integer NOT NULL DEFAULT 0;
  END IF;
END $$;

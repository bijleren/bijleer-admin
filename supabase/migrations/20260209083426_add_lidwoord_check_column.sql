/*
  # Add lidwoord_check column to wordfrequency table

  1. Changes
    - Add `lidwoord_check` column to `wordfrequency` table
      - Type: smallint
      - Default: 0
      - Nullable: true
      - Purpose: Track whether the lidwoord (article) has been verified by a user
  
  2. Notes
    - This column follows the same pattern as other _check columns in the table
    - Default value of 0 means not yet checked
    - Value of 1 means the lidwoord has been verified by a user
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wordfrequency' AND column_name = 'lidwoord_check'
  ) THEN
    ALTER TABLE wordfrequency ADD COLUMN lidwoord_check smallint DEFAULT 0;
  END IF;
END $$;

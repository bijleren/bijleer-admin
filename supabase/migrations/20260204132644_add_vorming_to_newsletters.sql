/*
  # Add vorming relation to newsletters

  1. Changes
    - Add `vorming_id` column to `newsletters` table
    - Add foreign key constraint to `didactiek_vormingen` table
    - Create index for better query performance
  
  2. Notes
    - The vorming_id is nullable to allow newsletters without a linked vorming
    - Existing newsletters will have NULL as vorming_id
*/

-- Add vorming_id column to newsletters table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'newsletters' AND column_name = 'vorming_id'
  ) THEN
    ALTER TABLE newsletters ADD COLUMN vorming_id uuid;
  END IF;
END $$;

-- Add foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'newsletters_vorming_id_fkey'
  ) THEN
    ALTER TABLE newsletters
    ADD CONSTRAINT newsletters_vorming_id_fkey
    FOREIGN KEY (vorming_id)
    REFERENCES didactiek_vormingen(id)
    ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_newsletters_vorming_id ON newsletters(vorming_id);
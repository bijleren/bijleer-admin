/*
  # Add 'reviewed' status to new_words table

  ## Changes
  - Drop existing status CHECK constraint on new_words table
  - Add new CHECK constraint that includes 'reviewed' status
  
  ## Valid Statuses
  - 'pending' - Word is awaiting quick review
  - 'reviewed' - Word passed quick review, awaiting klankteken check
  - 'approved' - Word has been added to wordfrequency
  - 'rejected' - Word was rejected during review
*/

-- Drop the existing constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'new_words_status_check'
  ) THEN
    ALTER TABLE new_words DROP CONSTRAINT new_words_status_check;
  END IF;
END $$;

-- Add the updated constraint with 'reviewed' status
ALTER TABLE new_words 
  ADD CONSTRAINT new_words_status_check 
  CHECK (status IN ('pending', 'reviewed', 'approved', 'rejected'));
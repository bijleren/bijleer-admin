/*
  # Add klankteken column to new_words table
  
  ## Overview
  This migration adds the klankteken (phoneme representation) column to the new_words table.
  This allows phonemes to be calculated when words are imported and edited before approval.
  
  ## Changes
  1. **New Column**
     - `klankteken` (varchar): Stores the phoneme representation of the word
     - Nullable to allow for words where klankteken hasn't been calculated yet
  
  ## Notes
  - Klankteken will be automatically calculated when words are imported
  - Users can edit the klankteken before approving words
  - When words are approved, the klankteken will be transferred to the wordfrequency table
*/

-- Add klankteken column to new_words table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'new_words' AND column_name = 'klankteken'
  ) THEN
    ALTER TABLE new_words ADD COLUMN klankteken VARCHAR;
  END IF;
END $$;

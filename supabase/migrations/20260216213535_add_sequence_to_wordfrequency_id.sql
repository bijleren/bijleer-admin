/*
  # Add auto-increment sequence to wordfrequency table
  
  ## Overview
  The wordfrequency table has an id column that requires a value but has no default.
  This migration creates a sequence and sets it as the default for the id column.
  
  ## Changes
  1. **Create Sequence**
     - Creates a sequence for wordfrequency id column
     - Sets the sequence to start from the current max id + 1
  
  2. **Set Default**
     - Sets the id column default to use the sequence
  
  ## Notes
  - Existing rows are not affected
  - New inserts will automatically get an id from the sequence
  - This fixes the "null value in column id" error when inserting new words
*/

DO $$
DECLARE
  max_id INTEGER;
BEGIN
  SELECT COALESCE(MAX(id), 0) INTO max_id FROM wordfrequency;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'wordfrequency_id_seq'
  ) THEN
    EXECUTE format('CREATE SEQUENCE wordfrequency_id_seq START WITH %s', max_id + 1);
  END IF;
  
  ALTER TABLE wordfrequency ALTER COLUMN id SET DEFAULT nextval('wordfrequency_id_seq');
  
  ALTER SEQUENCE wordfrequency_id_seq OWNED BY wordfrequency.id;
END $$;

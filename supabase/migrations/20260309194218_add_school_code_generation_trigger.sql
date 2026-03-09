/*
  # Add School Code Generation System

  1. New Functions
    - `generate_unique_school_code()` - Generates a random 6-character alphanumeric code
    - `ensure_school_code()` - Trigger function that generates code if missing

  2. Changes
    - Creates trigger on schools table to auto-generate school codes
    - Updates existing schools without codes to have unique codes

  3. Security
    - No RLS changes needed (operates at database level)

  Note: This migration is idempotent and safe to run multiple times
*/

-- Function to generate a random 6-character alphanumeric code
CREATE OR REPLACE FUNCTION generate_unique_school_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result text := '';
  i integer;
  code_exists boolean;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..6 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM schools WHERE school_code = result) INTO code_exists;
    
    -- Exit loop if code is unique
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN result;
END;
$$;

-- Trigger function to ensure school_code is set
CREATE OR REPLACE FUNCTION ensure_school_code()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.school_code IS NULL OR NEW.school_code = '' THEN
    NEW.school_code := generate_unique_school_code();
  END IF;
  RETURN NEW;
END;
$$;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS trigger_ensure_school_code ON schools;

-- Create trigger that runs before insert or update
CREATE TRIGGER trigger_ensure_school_code
  BEFORE INSERT OR UPDATE ON schools
  FOR EACH ROW
  EXECUTE FUNCTION ensure_school_code();

-- Update existing schools that don't have a school_code
DO $$
DECLARE
  school_record RECORD;
BEGIN
  FOR school_record IN 
    SELECT id FROM schools WHERE school_code IS NULL OR school_code = ''
  LOOP
    UPDATE schools 
    SET school_code = generate_unique_school_code()
    WHERE id = school_record.id;
  END LOOP;
END $$;
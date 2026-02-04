/*
  # Add Missing Columns to Schools Table
  
  1. Changes to Existing Tables
    - `schools`
      - Add `phone` (text) - School contact phone number
      - Add `email` (text) - School contact email address
      - Add `principal_name` (text) - Name of school principal
      - Add `website` (text) - School website URL
      - Add `student_count` (integer) - Total number of students enrolled
  
  2. Notes
    - All new columns are nullable to avoid breaking existing data
    - student_count defaults to 0 for new records
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'schools' AND column_name = 'phone'
  ) THEN
    ALTER TABLE schools ADD COLUMN phone text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'schools' AND column_name = 'email'
  ) THEN
    ALTER TABLE schools ADD COLUMN email text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'schools' AND column_name = 'principal_name'
  ) THEN
    ALTER TABLE schools ADD COLUMN principal_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'schools' AND column_name = 'website'
  ) THEN
    ALTER TABLE schools ADD COLUMN website text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'schools' AND column_name = 'student_count'
  ) THEN
    ALTER TABLE schools ADD COLUMN student_count integer DEFAULT 0;
  END IF;
END $$;

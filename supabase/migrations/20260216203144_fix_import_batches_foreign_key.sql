/*
  # Fix Foreign Key Constraints in Import System

  ## Changes
  - Drop foreign key constraints from import_batches, new_words, and rejected_words tables
  - The imported_by/reviewed_by/rejected_by fields will store UUIDs from auth.users
  - These don't need foreign key constraints since auth.users is managed by Supabase Auth

  ## Security
  - RLS policies remain unchanged and still protect the data
*/

-- Drop foreign key constraints
ALTER TABLE import_batches 
DROP CONSTRAINT IF EXISTS import_batches_imported_by_fkey;

ALTER TABLE new_words 
DROP CONSTRAINT IF EXISTS new_words_reviewed_by_fkey;

ALTER TABLE rejected_words 
DROP CONSTRAINT IF EXISTS rejected_words_rejected_by_fkey;

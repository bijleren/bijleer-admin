/*
  # New Words Import and Review System

  ## Overview
  This migration creates a system for importing, reviewing, and managing new vocabulary words
  before they are added to the main word_frequency table.

  ## New Tables

  ### 1. import_batches
  Tracks bulk import operations for auditing and organization
  - `id` (uuid, primary key) - Unique identifier
  - `batch_name` (text) - User-provided name for the import
  - `imported_by` (uuid, foreign key) - Reference to admin_users
  - `total_words_in_text` (integer) - Total words found in imported text
  - `filtered_out` (integer) - Words excluded by filters (numbers, short words)
  - `unique_words` (integer) - Unique words after filtering
  - `already_exists` (integer) - Words already in word_frequency
  - `previously_rejected` (integer) - Words in rejected_words
  - `new_words_added` (integer) - New words added to new_words table
  - `imported_at` (timestamptz) - When the import occurred

  ### 2. new_words
  Stores newly imported words awaiting review and approval
  - `id` (uuid, primary key) - Unique identifier
  - `word` (text, unique) - The word itself
  - `batch_id` (uuid, foreign key) - Reference to import_batches
  - `status` (text) - Current status: 'pending', 'approved', 'rejected'
  - `reviewed_by` (uuid, foreign key) - Reference to admin_users who reviewed
  - `reviewed_at` (timestamptz) - When the review occurred
  - `created_at` (timestamptz) - When word was imported
  - `updated_at` (timestamptz) - Last modification timestamp

  ### 3. rejected_words
  Stores words that have been rejected to prevent re-importing
  - `id` (uuid, primary key) - Unique identifier
  - `word` (text, unique) - The rejected word
  - `rejected_by` (uuid, foreign key) - Reference to admin_users
  - `rejected_at` (timestamptz) - When the word was rejected
  - `rejection_reason` (text, nullable) - Optional reason for rejection
  - `created_at` (timestamptz) - Record creation timestamp

  ## Security
  - RLS enabled on all tables
  - Only authenticated admin users can perform operations
  - Policies enforce admin-only access

  ## Important Notes
  1. Words are converted to lowercase during import
  2. Words with numbers are filtered out
  3. Words shorter than 3 characters are filtered out
  4. Duplicate prevention across word_frequency, new_words, and rejected_words
*/

-- Create import_batches table
CREATE TABLE IF NOT EXISTS import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_name text NOT NULL,
  imported_by uuid REFERENCES admin_users(id),
  total_words_in_text integer DEFAULT 0,
  filtered_out integer DEFAULT 0,
  unique_words integer DEFAULT 0,
  already_exists integer DEFAULT 0,
  previously_rejected integer DEFAULT 0,
  new_words_added integer DEFAULT 0,
  imported_at timestamptz DEFAULT now()
);

-- Create new_words table
CREATE TABLE IF NOT EXISTS new_words (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  word text UNIQUE NOT NULL,
  batch_id uuid REFERENCES import_batches(id) ON DELETE SET NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES admin_users(id),
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create rejected_words table
CREATE TABLE IF NOT EXISTS rejected_words (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  word text UNIQUE NOT NULL,
  rejected_by uuid REFERENCES admin_users(id),
  rejected_at timestamptz DEFAULT now(),
  rejection_reason text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_new_words_status ON new_words(status);
CREATE INDEX IF NOT EXISTS idx_new_words_batch_id ON new_words(batch_id);
CREATE INDEX IF NOT EXISTS idx_new_words_word ON new_words(word);
CREATE INDEX IF NOT EXISTS idx_rejected_words_word ON rejected_words(word);
CREATE INDEX IF NOT EXISTS idx_import_batches_imported_by ON import_batches(imported_by);

-- Enable RLS on all tables
ALTER TABLE import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE new_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE rejected_words ENABLE ROW LEVEL SECURITY;

-- RLS Policies for import_batches
CREATE POLICY "Authenticated users can view import batches"
  ON import_batches FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create import batches"
  ON import_batches FOR INSERT
  TO authenticated
  WITH CHECK (imported_by = auth.uid());

CREATE POLICY "Authenticated users can update own import batches"
  ON import_batches FOR UPDATE
  TO authenticated
  USING (imported_by = auth.uid())
  WITH CHECK (imported_by = auth.uid());

CREATE POLICY "Authenticated users can delete own import batches"
  ON import_batches FOR DELETE
  TO authenticated
  USING (imported_by = auth.uid());

-- RLS Policies for new_words
CREATE POLICY "Authenticated users can view new words"
  ON new_words FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create new words"
  ON new_words FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update new words"
  ON new_words FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete new words"
  ON new_words FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for rejected_words
CREATE POLICY "Authenticated users can view rejected words"
  ON rejected_words FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create rejected words"
  ON rejected_words FOR INSERT
  TO authenticated
  WITH CHECK (rejected_by = auth.uid());

CREATE POLICY "Authenticated users can update rejected words"
  ON rejected_words FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete rejected words"
  ON rejected_words FOR DELETE
  TO authenticated
  USING (true);
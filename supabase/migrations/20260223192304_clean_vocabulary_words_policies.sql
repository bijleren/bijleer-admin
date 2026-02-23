/*
  # Clean up vocabulary_words RLS policies

  1. Changes
    - Drop all existing policies on vocabulary_words
    - Create simple, clean policies that only check admin_users table
    - Avoid accessing auth.users table which requires special permissions
  
  2. Security
    - Admin users (in admin_users table) can manage all words
    - All authenticated users can read words
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "Admin users can delete vocabulary words" ON vocabulary_words;
DROP POLICY IF EXISTS "Admin users can insert vocabulary words" ON vocabulary_words;
DROP POLICY IF EXISTS "Admin users can update vocabulary words" ON vocabulary_words;
DROP POLICY IF EXISTS "Admins can delete vocabulary words" ON vocabulary_words;
DROP POLICY IF EXISTS "Admins can insert vocabulary words" ON vocabulary_words;
DROP POLICY IF EXISTS "Admins can manage vocabulary words" ON vocabulary_words;
DROP POLICY IF EXISTS "Admins can update vocabulary words" ON vocabulary_words;
DROP POLICY IF EXISTS "Anyone can read vocabulary words" ON vocabulary_words;

-- Create clean, simple policies
CREATE POLICY "Allow authenticated users to read vocabulary words"
  ON vocabulary_words
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow admins to insert vocabulary words"
  ON vocabulary_words
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

CREATE POLICY "Allow admins to update vocabulary words"
  ON vocabulary_words
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

CREATE POLICY "Allow admins to delete vocabulary words"
  ON vocabulary_words
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );
/*
  # Fix Vocabulary Management Permissions

  1. Changes
    - Drop restrictive policies on vocabulary_words and vocabulary_categories
    - Add new policies allowing admins to manage vocabulary words and categories
    - Keep read access for all authenticated users
  
  2. Security
    - Only users in admin_users table can INSERT, UPDATE, DELETE
    - All authenticated users can SELECT (read)
*/

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Only system can modify vocabulary words" ON vocabulary_words;
DROP POLICY IF EXISTS "Only system can modify vocabulary categories" ON vocabulary_categories;

-- Vocabulary Words: Allow admins to manage
CREATE POLICY "Admins can manage vocabulary words"
  ON vocabulary_words
  FOR ALL
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

-- Vocabulary Categories: Allow admins to manage
CREATE POLICY "Admins can manage vocabulary categories"
  ON vocabulary_categories
  FOR ALL
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
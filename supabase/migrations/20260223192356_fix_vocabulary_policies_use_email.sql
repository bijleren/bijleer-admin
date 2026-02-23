/*
  # Fix vocabulary RLS policies to check by email

  1. Changes
    - Update all vocabulary_words and vocabulary_categories policies
    - Check admin_users by email instead of id
    - Use auth.email() function to get current user's email
  
  2. Security
    - Admin users (matched by email) can manage words and categories
    - All authenticated users can read
*/

-- Drop existing policies for vocabulary_words
DROP POLICY IF EXISTS "Allow authenticated users to read vocabulary words" ON vocabulary_words;
DROP POLICY IF EXISTS "Allow admins to insert vocabulary words" ON vocabulary_words;
DROP POLICY IF EXISTS "Allow admins to update vocabulary words" ON vocabulary_words;
DROP POLICY IF EXISTS "Allow admins to delete vocabulary words" ON vocabulary_words;

-- Create new policies using email matching
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
      WHERE admin_users.email = auth.email()
    )
  );

CREATE POLICY "Allow admins to update vocabulary words"
  ON vocabulary_words
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.email = auth.email()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.email = auth.email()
    )
  );

CREATE POLICY "Allow admins to delete vocabulary words"
  ON vocabulary_words
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.email = auth.email()
    )
  );

-- Drop existing policies for vocabulary_categories
DROP POLICY IF EXISTS "Allow authenticated users to read vocabulary categories" ON vocabulary_categories;
DROP POLICY IF EXISTS "Allow admins to insert vocabulary categories" ON vocabulary_categories;
DROP POLICY IF EXISTS "Allow admins to update vocabulary categories" ON vocabulary_categories;
DROP POLICY IF EXISTS "Allow admins to delete vocabulary categories" ON vocabulary_categories;

-- Create new policies using email matching
CREATE POLICY "Allow authenticated users to read vocabulary categories"
  ON vocabulary_categories
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow admins to insert vocabulary categories"
  ON vocabulary_categories
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.email = auth.email()
    )
  );

CREATE POLICY "Allow admins to update vocabulary categories"
  ON vocabulary_categories
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.email = auth.email()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.email = auth.email()
    )
  );

CREATE POLICY "Allow admins to delete vocabulary categories"
  ON vocabulary_categories
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.email = auth.email()
    )
  );
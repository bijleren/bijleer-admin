/*
  # Clean up vocabulary_categories RLS policies

  1. Changes
    - Drop all existing policies on vocabulary_categories
    - Create simple, clean policies that only check admin_users table
  
  2. Security
    - Admin users can manage all categories
    - All authenticated users can read categories
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "Admins can manage vocabulary categories" ON vocabulary_categories;
DROP POLICY IF EXISTS "Anyone can read vocabulary categories" ON vocabulary_categories;

-- Create clean, simple policies
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
      WHERE admin_users.id = auth.uid()
    )
  );

CREATE POLICY "Allow admins to update vocabulary categories"
  ON vocabulary_categories
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

CREATE POLICY "Allow admins to delete vocabulary categories"
  ON vocabulary_categories
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );
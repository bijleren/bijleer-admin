/*
  # Secure exercise_types with RLS

  ## Summary
  Enables Row Level Security on the exercise_types table and replaces the
  existing unrestricted open policies with proper access control.

  ## Access rules
  - SELECT: everyone (unauthenticated and authenticated) can read rows — public read
  - INSERT / UPDATE / DELETE: only users whose email exists in admin_users

  ## Changes
  - Enable RLS on exercise_types
  - Drop the two existing open SELECT policies (Allow read for all, public_read_exercise_types)
  - Add a new public SELECT policy
  - Add INSERT, UPDATE, DELETE policies restricted to admin_users
*/

ALTER TABLE exercise_types ENABLE ROW LEVEL SECURITY;

-- Drop old unrestricted policies
DROP POLICY IF EXISTS "Allow read for all" ON exercise_types;
DROP POLICY IF EXISTS "public_read_exercise_types" ON exercise_types;

-- Everyone can read
CREATE POLICY "Anyone can view exercise types"
  ON exercise_types
  FOR SELECT
  USING (true);

-- Only admins can insert
CREATE POLICY "Admins can insert exercise types"
  ON exercise_types
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- Only admins can update
CREATE POLICY "Admins can update exercise types"
  ON exercise_types
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- Only admins can delete
CREATE POLICY "Admins can delete exercise types"
  ON exercise_types
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

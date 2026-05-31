/*
  # Add admin policies to schools table

  ## Problem
  The schools table only has a "user reads own schools" SELECT policy, so admins
  only see schools they personally belong to — not all schools on the platform.

  ## Fix
  Add SELECT, INSERT, UPDATE, and DELETE policies for admins so the admin panel
  has full access to all schools.
*/

CREATE POLICY "Admins can read all schools"
  ON schools
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE email = auth.email())
  );

CREATE POLICY "Admins can insert schools"
  ON schools
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM admin_users WHERE email = auth.email())
  );

CREATE POLICY "Admins can update all schools"
  ON schools
  FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE email = auth.email()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE email = auth.email()));

CREATE POLICY "Admins can delete schools"
  ON schools
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE email = auth.email())
  );

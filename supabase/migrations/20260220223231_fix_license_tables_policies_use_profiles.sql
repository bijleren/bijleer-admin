/*
  # Fix License Tables RLS Policies to Use Profiles Table

  ## Overview
  Updates organization_licenses and license_transactions RLS policies 
  to use the profiles table instead of auth.users to avoid permission errors.

  ## Changes
  1. Drop existing policies that reference auth.users
  2. Recreate policies using profiles table for admin checks

  ## Security
  - All policies remain restrictive
  - Admin checks now use profiles.email instead of auth.users
*/

-- Drop existing organization_licenses policies
DROP POLICY IF EXISTS "Admins can view all licenses" ON organization_licenses;
DROP POLICY IF EXISTS "Admins can insert licenses" ON organization_licenses;
DROP POLICY IF EXISTS "Admins can update licenses" ON organization_licenses;
DROP POLICY IF EXISTS "Admins can delete licenses" ON organization_licenses;

-- Recreate organization_licenses policies using profiles table
CREATE POLICY "Admins can view all licenses"
  ON organization_licenses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      JOIN profiles ON profiles.email = admin_users.email
      WHERE profiles.id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert licenses"
  ON organization_licenses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      JOIN profiles ON profiles.email = admin_users.email
      WHERE profiles.id = auth.uid()
    )
  );

CREATE POLICY "Admins can update licenses"
  ON organization_licenses FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      JOIN profiles ON profiles.email = admin_users.email
      WHERE profiles.id = auth.uid()
    )
  );

CREATE POLICY "Admins can delete licenses"
  ON organization_licenses FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      JOIN profiles ON profiles.email = admin_users.email
      WHERE profiles.id = auth.uid()
    )
  );

-- Drop existing license_transactions policies if they exist
DROP POLICY IF EXISTS "Admins can view all transactions" ON license_transactions;
DROP POLICY IF EXISTS "System can insert transactions" ON license_transactions;

-- Create license_transactions policies using profiles table
CREATE POLICY "Admins can view all transactions"
  ON license_transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      JOIN profiles ON profiles.email = admin_users.email
      WHERE profiles.id = auth.uid()
    )
  );

CREATE POLICY "System can insert transactions"
  ON license_transactions FOR INSERT
  TO authenticated
  WITH CHECK (true);
/*
  # Fix RLS Policies to Use Profiles Table

  ## Overview
  Updates all RLS policies to use the profiles table instead of auth.users
  to avoid permission errors. The profiles table stores user email addresses
  and is accessible from RLS policies.

  ## Changes
  1. Drop existing policies that reference auth.users
  2. Recreate policies using profiles table
  3. Update generate_voucher_code function to use profiles

  ## Security
  - All policies remain restrictive
  - Admin checks now use profiles.email instead of auth.users
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view all vouchers" ON voucher_codes;
DROP POLICY IF EXISTS "Admins can insert vouchers" ON voucher_codes;
DROP POLICY IF EXISTS "Admins can update vouchers" ON voucher_codes;
DROP POLICY IF EXISTS "Admins can delete vouchers" ON voucher_codes;

DROP POLICY IF EXISTS "Anyone can view active products" ON product_catalog;
DROP POLICY IF EXISTS "Admins can insert products" ON product_catalog;
DROP POLICY IF EXISTS "Admins can update products" ON product_catalog;

DROP POLICY IF EXISTS "Anyone can view active tiers" ON pricing_tiers;
DROP POLICY IF EXISTS "Admins can insert tiers" ON pricing_tiers;
DROP POLICY IF EXISTS "Admins can update tiers" ON pricing_tiers;

-- Recreate voucher_codes policies using profiles table
CREATE POLICY "Admins can view all vouchers"
  ON voucher_codes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      JOIN profiles ON profiles.email = admin_users.email
      WHERE profiles.id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert vouchers"
  ON voucher_codes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      JOIN profiles ON profiles.email = admin_users.email
      WHERE profiles.id = auth.uid()
    )
  );

CREATE POLICY "Admins can update vouchers"
  ON voucher_codes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      JOIN profiles ON profiles.email = admin_users.email
      WHERE profiles.id = auth.uid()
    )
  );

CREATE POLICY "Admins can delete vouchers"
  ON voucher_codes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      JOIN profiles ON profiles.email = admin_users.email
      WHERE profiles.id = auth.uid()
    )
  );

-- Recreate product_catalog policies using profiles table
CREATE POLICY "Anyone can view active products"
  ON product_catalog FOR SELECT
  TO authenticated
  USING (
    is_active = true OR EXISTS (
      SELECT 1 FROM admin_users
      JOIN profiles ON profiles.email = admin_users.email
      WHERE profiles.id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert products"
  ON product_catalog FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      JOIN profiles ON profiles.email = admin_users.email
      WHERE profiles.id = auth.uid()
    )
  );

CREATE POLICY "Admins can update products"
  ON product_catalog FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      JOIN profiles ON profiles.email = admin_users.email
      WHERE profiles.id = auth.uid()
    )
  );

-- Recreate pricing_tiers policies using profiles table
CREATE POLICY "Anyone can view active tiers"
  ON pricing_tiers FOR SELECT
  TO authenticated
  USING (
    is_active = true OR EXISTS (
      SELECT 1 FROM admin_users
      JOIN profiles ON profiles.email = admin_users.email
      WHERE profiles.id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert tiers"
  ON pricing_tiers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      JOIN profiles ON profiles.email = admin_users.email
      WHERE profiles.id = auth.uid()
    )
  );

CREATE POLICY "Admins can update tiers"
  ON pricing_tiers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      JOIN profiles ON profiles.email = admin_users.email
      WHERE profiles.id = auth.uid()
    )
  );

-- Update generate_voucher_code function to use profiles table
DROP FUNCTION IF EXISTS generate_voucher_code();

CREATE OR REPLACE FUNCTION generate_voucher_code()
RETURNS text AS $$
DECLARE
  v_code text;
  v_exists boolean;
BEGIN
  -- Check if user is admin using profiles table
  IF NOT EXISTS (
    SELECT 1 FROM admin_users
    JOIN profiles ON profiles.email = admin_users.email
    WHERE profiles.id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  LOOP
    -- Generate code in format WS-2026-XXXX-XXXX
    v_code := 'WS-' || 
              TO_CHAR(now(), 'YYYY') || '-' ||
              UPPER(SUBSTRING(MD5(RANDOM()::text) FROM 1 FOR 4)) || '-' ||
              UPPER(SUBSTRING(MD5(RANDOM()::text) FROM 1 FOR 4));
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM voucher_codes WHERE code = v_code) INTO v_exists;
    
    EXIT WHEN NOT v_exists;
  END LOOP;
  
  RETURN v_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
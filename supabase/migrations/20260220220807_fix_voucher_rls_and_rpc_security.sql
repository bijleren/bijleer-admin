/*
  # Fix Voucher RLS Policies and RPC Security

  ## Changes
  1. Update generate_voucher_code to use SECURITY DEFINER
  2. Fix RLS policies to properly check admin status
  3. Add missing DELETE policy for voucher_codes

  ## Security
  - Ensures only authenticated admin users can manage vouchers
  - Uses proper admin authentication checks
*/

-- Drop and recreate generate_voucher_code with SECURITY DEFINER
DROP FUNCTION IF EXISTS generate_voucher_code();

CREATE OR REPLACE FUNCTION generate_voucher_code()
RETURNS text AS $$
DECLARE
  v_code text;
  v_exists boolean;
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.email = (SELECT email FROM auth.users WHERE id = auth.uid())
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

-- Add DELETE policy for voucher_codes
DROP POLICY IF EXISTS "Admins can delete vouchers" ON voucher_codes;

CREATE POLICY "Admins can delete vouchers"
  ON voucher_codes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );
/*
  # License Management RPC Functions

  ## Overview
  Creates secure database functions for license management operations including
  license checking, voucher redemption, license extensions, and reporting.

  ## Functions Created

  1. `check_license_access` - Check if organization has active license for product
  2. `redeem_voucher_code` - Redeem a voucher and create/extend license
  3. `extend_license_from_purchase` - Extend license after Stripe payment (for PHP platform)
  4. `get_organization_licenses` - Get all licenses for an organization
  5. `cancel_license` - Cancel a license with audit trail
  6. `get_expiring_licenses` - Get licenses expiring within X days
  7. `generate_voucher_code` - Generate unique voucher code

  ## Security
  All functions check authentication and admin status where appropriate
*/

-- Function to check license access for an organization and product
CREATE OR REPLACE FUNCTION check_license_access(
  p_organization_id uuid,
  p_product_type text
)
RETURNS TABLE (
  has_access boolean,
  license_type text,
  status text,
  valid_until timestamptz,
  days_remaining integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE WHEN ol.status = 'active' AND ol.valid_until > now() THEN true ELSE false END as has_access,
    ol.license_type::text,
    ol.status::text,
    ol.valid_until,
    EXTRACT(DAY FROM (ol.valid_until - now()))::integer as days_remaining
  FROM organization_licenses ol
  WHERE ol.organization_id = p_organization_id
    AND ol.product_type = p_product_type::product_type
    AND ol.status = 'active'
  ORDER BY ol.valid_until DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to redeem a voucher code
CREATE OR REPLACE FUNCTION redeem_voucher_code(
  p_code text,
  p_organization_id uuid,
  p_user_id uuid
)
RETURNS jsonb AS $$
DECLARE
  v_voucher voucher_codes%ROWTYPE;
  v_existing_license organization_licenses%ROWTYPE;
  v_new_license_id uuid;
  v_new_valid_until timestamptz;
  v_result jsonb;
BEGIN
  -- Check if user is authenticated
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get voucher details
  SELECT * INTO v_voucher
  FROM voucher_codes
  WHERE code = p_code AND status = 'unused';

  -- Validate voucher
  IF v_voucher IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or already used voucher code');
  END IF;

  IF v_voucher.expires_at IS NOT NULL AND v_voucher.expires_at < now() THEN
    UPDATE voucher_codes SET status = 'expired' WHERE id = v_voucher.id;
    RETURN jsonb_build_object('success', false, 'error', 'Voucher has expired');
  END IF;

  -- Check for existing active license
  SELECT * INTO v_existing_license
  FROM organization_licenses
  WHERE organization_id = p_organization_id
    AND product_type = v_voucher.product_type
    AND status = 'active'
  ORDER BY valid_until DESC
  LIMIT 1;

  -- Calculate new valid_until date
  IF v_existing_license IS NOT NULL AND v_existing_license.valid_until > now() THEN
    -- Extend existing license
    v_new_valid_until := v_existing_license.valid_until + (v_voucher.duration_days || ' days')::interval;
    
    UPDATE organization_licenses
    SET valid_until = v_new_valid_until,
        updated_at = now()
    WHERE id = v_existing_license.id;
    
    v_new_license_id := v_existing_license.id;
    
    -- Log transaction
    INSERT INTO license_transactions (
      license_id, organization_id, transaction_type, product_type,
      payment_method, voucher_code_id, previous_valid_until, new_valid_until,
      notes, created_by_user_id
    ) VALUES (
      v_new_license_id, p_organization_id, 'extended', v_voucher.product_type,
      'voucher', v_voucher.id, v_existing_license.valid_until, v_new_valid_until,
      'License extended via voucher: ' || p_code, p_user_id
    );
  ELSE
    -- Create new license
    v_new_valid_until := now() + (v_voucher.duration_days || ' days')::interval;
    
    INSERT INTO organization_licenses (
      organization_id, product_type, license_type, status,
      valid_from, valid_until, voucher_code_id, pricing_tier,
      created_by_user_id
    ) VALUES (
      p_organization_id, v_voucher.product_type, 'paid_voucher', 'active',
      now(), v_new_valid_until, v_voucher.id, v_voucher.pricing_tier,
      p_user_id
    ) RETURNING id INTO v_new_license_id;
    
    -- Log transaction
    INSERT INTO license_transactions (
      license_id, organization_id, transaction_type, product_type,
      payment_method, voucher_code_id, new_valid_until,
      notes, created_by_user_id
    ) VALUES (
      v_new_license_id, p_organization_id, 'created', v_voucher.product_type,
      'voucher', v_voucher.id, v_new_valid_until,
      'License created via voucher: ' || p_code, p_user_id
    );
  END IF;

  -- Mark voucher as redeemed
  UPDATE voucher_codes
  SET status = 'redeemed',
      redeemed_at = now(),
      redeemed_by_organization_id = p_organization_id,
      redeemed_by_user_id = p_user_id
  WHERE id = v_voucher.id;

  RETURN jsonb_build_object(
    'success', true,
    'license_id', v_new_license_id,
    'valid_until', v_new_valid_until,
    'product_type', v_voucher.product_type::text
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to extend license from Stripe purchase (for PHP platform)
CREATE OR REPLACE FUNCTION extend_license_from_purchase(
  p_organization_id uuid,
  p_product_type text,
  p_duration_days integer,
  p_stripe_payment_intent_id text,
  p_amount_eur numeric,
  p_pricing_tier text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_existing_license organization_licenses%ROWTYPE;
  v_new_license_id uuid;
  v_new_valid_until timestamptz;
BEGIN
  -- Check for existing active license
  SELECT * INTO v_existing_license
  FROM organization_licenses
  WHERE organization_id = p_organization_id
    AND product_type = p_product_type::product_type
    AND status = 'active'
  ORDER BY valid_until DESC
  LIMIT 1;

  -- Calculate new valid_until date
  IF v_existing_license IS NOT NULL AND v_existing_license.valid_until > now() THEN
    -- Extend existing license
    v_new_valid_until := v_existing_license.valid_until + (p_duration_days || ' days')::interval;
    
    UPDATE organization_licenses
    SET valid_until = v_new_valid_until,
        updated_at = now()
    WHERE id = v_existing_license.id;
    
    v_new_license_id := v_existing_license.id;
    
    -- Log transaction
    INSERT INTO license_transactions (
      license_id, organization_id, transaction_type, product_type,
      payment_method, amount_eur, stripe_payment_intent_id,
      previous_valid_until, new_valid_until,
      notes
    ) VALUES (
      v_new_license_id, p_organization_id, 'extended', p_product_type::product_type,
      'stripe', p_amount_eur, p_stripe_payment_intent_id,
      v_existing_license.valid_until, v_new_valid_until,
      'License extended via Stripe payment'
    );
  ELSE
    -- Create new license
    v_new_valid_until := now() + (p_duration_days || ' days')::interval;
    
    INSERT INTO organization_licenses (
      organization_id, product_type, license_type, status,
      valid_from, valid_until, pricing_tier
    ) VALUES (
      p_organization_id, p_product_type::product_type, 'paid_stripe', 'active',
      now(), v_new_valid_until, p_pricing_tier
    ) RETURNING id INTO v_new_license_id;
    
    -- Log transaction
    INSERT INTO license_transactions (
      license_id, organization_id, transaction_type, product_type,
      payment_method, amount_eur, stripe_payment_intent_id,
      new_valid_until, notes
    ) VALUES (
      v_new_license_id, p_organization_id, 'created', p_product_type::product_type,
      'stripe', p_amount_eur, p_stripe_payment_intent_id,
      v_new_valid_until, 'License created via Stripe payment'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'license_id', v_new_license_id,
    'valid_until', v_new_valid_until
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all licenses for an organization
CREATE OR REPLACE FUNCTION get_organization_licenses(p_organization_id uuid)
RETURNS TABLE (
  id uuid,
  product_type text,
  license_type text,
  status text,
  valid_from timestamptz,
  valid_until timestamptz,
  days_remaining integer,
  pricing_tier text,
  notes text,
  created_at timestamptz
) AS $$
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.email = (SELECT email FROM auth.users WHERE id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT 
    ol.id,
    ol.product_type::text,
    ol.license_type::text,
    ol.status::text,
    ol.valid_from,
    ol.valid_until,
    EXTRACT(DAY FROM (ol.valid_until - now()))::integer as days_remaining,
    ol.pricing_tier,
    ol.notes,
    ol.created_at
  FROM organization_licenses ol
  WHERE ol.organization_id = p_organization_id
  ORDER BY ol.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cancel a license
CREATE OR REPLACE FUNCTION cancel_license(
  p_license_id uuid,
  p_reason text
)
RETURNS jsonb AS $$
DECLARE
  v_license organization_licenses%ROWTYPE;
  v_user_id uuid;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.email = (SELECT email FROM auth.users WHERE id = v_user_id)
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Get license
  SELECT * INTO v_license FROM organization_licenses WHERE id = p_license_id;
  
  IF v_license IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'License not found');
  END IF;

  -- Update license status
  UPDATE organization_licenses
  SET status = 'cancelled', updated_at = now()
  WHERE id = p_license_id;

  -- Log transaction
  INSERT INTO license_transactions (
    license_id, organization_id, transaction_type, product_type,
    payment_method, previous_valid_until, notes, created_by_user_id
  ) VALUES (
    p_license_id, v_license.organization_id, 'cancelled', v_license.product_type,
    v_license.license_type::text, v_license.valid_until, p_reason, v_user_id
  );

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get expiring licenses
CREATE OR REPLACE FUNCTION get_expiring_licenses(p_days_threshold integer DEFAULT 30)
RETURNS TABLE (
  license_id uuid,
  organization_id uuid,
  organization_name text,
  product_type text,
  license_type text,
  valid_until timestamptz,
  days_remaining integer,
  email text,
  phone text
) AS $$
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.email = (SELECT email FROM auth.users WHERE id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT 
    ol.id as license_id,
    ol.organization_id,
    s.name as organization_name,
    ol.product_type::text,
    ol.license_type::text,
    ol.valid_until,
    EXTRACT(DAY FROM (ol.valid_until - now()))::integer as days_remaining,
    s.email,
    s.phone
  FROM organization_licenses ol
  JOIN schools s ON s.id = ol.organization_id
  WHERE ol.status = 'active'
    AND ol.valid_until <= now() + (p_days_threshold || ' days')::interval
    AND ol.valid_until > now()
  ORDER BY ol.valid_until ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate unique voucher code
CREATE OR REPLACE FUNCTION generate_voucher_code()
RETURNS text AS $$
DECLARE
  v_code text;
  v_exists boolean;
BEGIN
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
$$ LANGUAGE plpgsql;
/*
  # Migrate Premium Schools to License System

  ## Overview
  Migrates all existing schools with premium_school = 1 to the new license system.
  Creates active licenses for Woordenschat product with 1-year validity.

  ## Process
  1. Find all schools with premium_school = 1
  2. Create organization_licenses records with:
     - product_type: 'woordenschat'
     - license_type: 'manual'
     - status: 'active'
     - valid_from: current timestamp
     - valid_until: 1 year from now
  3. Create corresponding license_transactions records for audit trail
  4. Mark transactions as 'migration' type

  ## Notes
  - Does not delete premium_school column (kept for backward compatibility)
  - All migrated licenses are marked as 'manual' type
  - Creates audit trail via license_transactions
  - Safe to run multiple times (checks for existing licenses)
*/

-- Migrate premium schools to license system
DO $$
DECLARE
  school_record RECORD;
  new_license_id uuid;
  valid_until_date timestamptz;
BEGIN
  -- Set valid_until to 1 year from now
  valid_until_date := now() + interval '1 year';

  -- Loop through all premium schools
  FOR school_record IN 
    SELECT id, name 
    FROM schools 
    WHERE premium_school = 1
  LOOP
    -- Check if license already exists for this school
    IF NOT EXISTS (
      SELECT 1 FROM organization_licenses 
      WHERE organization_id = school_record.id 
        AND product_type = 'woordenschat'
    ) THEN
      -- Create new license
      INSERT INTO organization_licenses (
        organization_id,
        product_type,
        license_type,
        status,
        valid_from,
        valid_until,
        notes
      ) VALUES (
        school_record.id,
        'woordenschat',
        'manual',
        'active',
        now(),
        valid_until_date,
        'Migrated from premium_school flag'
      ) RETURNING id INTO new_license_id;

      -- Create transaction record
      INSERT INTO license_transactions (
        license_id,
        organization_id,
        transaction_type,
        product_type,
        payment_method,
        new_valid_until,
        notes
      ) VALUES (
        new_license_id,
        school_record.id,
        'migration',
        'woordenschat',
        'migration',
        valid_until_date,
        'Initial migration from premium_school system to license management system'
      );

      RAISE NOTICE 'Migrated license for school: % (ID: %)', school_record.name, school_record.id;
    ELSE
      RAISE NOTICE 'License already exists for school: % (ID: %)', school_record.name, school_record.id;
    END IF;
  END LOOP;
END $$;

-- Create function to keep premium_school in sync with license status
-- This ensures backward compatibility during transition period
CREATE OR REPLACE FUNCTION sync_premium_school_flag()
RETURNS TRIGGER AS $$
BEGIN
  -- When a woordenschat license becomes active
  IF NEW.product_type = 'woordenschat' AND NEW.status = 'active' THEN
    UPDATE schools 
    SET premium_school = 1 
    WHERE id = NEW.organization_id;
  END IF;

  -- When a woordenschat license becomes inactive
  IF NEW.product_type = 'woordenschat' AND NEW.status IN ('expired', 'cancelled') THEN
    -- Only set to 0 if there are no other active woordenschat licenses
    IF NOT EXISTS (
      SELECT 1 FROM organization_licenses
      WHERE organization_id = NEW.organization_id
        AND product_type = 'woordenschat'
        AND status = 'active'
        AND id != NEW.id
    ) THEN
      UPDATE schools 
      SET premium_school = 0 
      WHERE id = NEW.organization_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for sync
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'sync_premium_school_on_license_change'
  ) THEN
    CREATE TRIGGER sync_premium_school_on_license_change
      AFTER INSERT OR UPDATE ON organization_licenses
      FOR EACH ROW
      EXECUTE FUNCTION sync_premium_school_flag();
  END IF;
END $$;

-- Create function to automatically update storage limits based on storage_upgrade licenses
CREATE OR REPLACE FUNCTION update_storage_limit_from_license()
RETURNS TRIGGER AS $$
DECLARE
  storage_bytes bigint;
BEGIN
  -- Only process storage_upgrade product type
  IF NEW.product_type != 'storage_upgrade' THEN
    RETURN NEW;
  END IF;

  -- When storage_upgrade license becomes active
  IF NEW.status = 'active' THEN
    -- Determine storage limit based on pricing tier
    storage_bytes := CASE NEW.pricing_tier
      WHEN 'basic' THEN 10737418240      -- 10GB
      WHEN 'pro' THEN 26843545600        -- 25GB
      WHEN 'enterprise' THEN 53687091200 -- 50GB
      ELSE 5368709120                    -- 5GB default
    END;

    -- Update school's storage limit
    UPDATE schools 
    SET storage_limit_bytes = storage_bytes
    WHERE id = NEW.organization_id;

    RAISE NOTICE 'Updated storage limit for organization % to % bytes', NEW.organization_id, storage_bytes;
  END IF;

  -- When storage_upgrade license becomes inactive
  IF NEW.status IN ('expired', 'cancelled') THEN
    -- Check if there are any other active storage_upgrade licenses
    IF NOT EXISTS (
      SELECT 1 FROM organization_licenses
      WHERE organization_id = NEW.organization_id
        AND product_type = 'storage_upgrade'
        AND status = 'active'
        AND id != NEW.id
    ) THEN
      -- Revert to default 5GB
      UPDATE schools 
      SET storage_limit_bytes = 5368709120
      WHERE id = NEW.organization_id;

      RAISE NOTICE 'Reverted storage limit for organization % to default 5GB', NEW.organization_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for storage limit updates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_storage_on_license_change'
  ) THEN
    CREATE TRIGGER update_storage_on_license_change
      AFTER INSERT OR UPDATE ON organization_licenses
      FOR EACH ROW
      EXECUTE FUNCTION update_storage_limit_from_license();
  END IF;
END $$;
/*
  # License Management System

  ## Overview
  Creates a comprehensive license management system supporting multiple products,
  payment methods (Stripe via PHP, ODOO vouchers, manual grants), and automatic
  expiration tracking with storage upgrade integration.

  ## 1. New Tables

  ### `organization_licenses`
  Core license tracking table for all products and organizations
  - `id` (uuid, primary key) - Unique license identifier
  - `organization_id` (uuid, foreign key) - Links to schools table
  - `product_type` (enum) - Type of product (woordenschat, storage_upgrade, etc.)
  - `license_type` (enum) - How license was obtained (trial, paid_stripe, paid_voucher, manual)
  - `status` (enum) - Current license state (active, expired, cancelled, pending)
  - `valid_from` (timestamptz) - License start date
  - `valid_until` (timestamptz) - License expiration date
  - `auto_renew` (boolean) - Whether license auto-renews (future Stripe subscriptions)
  - `stripe_subscription_id` (text) - Stripe subscription reference
  - `voucher_code_id` (uuid) - Links to voucher if redeemed
  - `pricing_tier` (text) - For storage upgrades: basic, pro, enterprise
  - `notes` (text) - Internal notes and references
  - `created_at`, `updated_at` (timestamptz) - Audit timestamps
  - `created_by_user_id` (uuid) - Admin who created license

  ### `voucher_codes`
  Tracks ODOO-generated voucher codes for license redemption
  - `id` (uuid, primary key) - Unique voucher identifier
  - `code` (text, unique) - Redemption code (e.g., WS-2025-XXXX-XXXX)
  - `product_type` (enum) - Product this voucher unlocks
  - `duration_days` (integer) - License duration when redeemed
  - `pricing_tier` (text) - For storage upgrades
  - `status` (enum) - unused, redeemed, expired, cancelled
  - `odoo_reference` (text) - External ODOO order/invoice reference
  - `expires_at` (timestamptz) - Voucher cannot be redeemed after this date
  - `redeemed_at` (timestamptz) - When voucher was used
  - `redeemed_by_organization_id` (uuid) - Which organization redeemed it
  - `redeemed_by_user_id` (uuid) - Which user redeemed it
  - `created_at`, `updated_at` (timestamptz) - Audit timestamps

  ### `license_transactions`
  Complete audit trail of all license operations
  - `id` (uuid, primary key) - Transaction identifier
  - `license_id` (uuid) - Links to organization_licenses
  - `organization_id` (uuid) - Links to schools table
  - `transaction_type` (enum) - created, renewed, extended, cancelled, expired, migration
  - `product_type` (enum) - Product affected
  - `payment_method` (text) - stripe, voucher, manual, migration
  - `amount_eur` (numeric) - Transaction amount in euros
  - `stripe_payment_intent_id` (text) - Stripe payment reference
  - `voucher_code_id` (uuid) - Voucher used if applicable
  - `previous_valid_until` (timestamptz) - Old expiration date
  - `new_valid_until` (timestamptz) - New expiration date
  - `notes` (text) - Transaction details
  - `created_by_user_id` (uuid) - Who performed the action
  - `created_at` (timestamptz) - When transaction occurred

  ## 2. Enums
  - `product_type`: woordenschat, storage_upgrade, digitools, webwijzer
  - `license_type`: trial, paid_stripe, paid_voucher, manual
  - `license_status`: active, expired, cancelled, pending
  - `transaction_type`: created, renewed, extended, cancelled, expired, migration
  - `voucher_status`: unused, redeemed, expired, cancelled

  ## 3. Security
  - Enable RLS on all tables
  - Admin users can view all licenses
  - PHP platform can access via service role
  - Users can only view their organization's licenses
  - Voucher redemption through secure RPC only

  ## 4. Indexes
  - organization_id for fast license lookups
  - product_type and status for filtering
  - valid_until for expiration queries
  - voucher code for redemption lookups
*/

-- Create enums
DO $$ BEGIN
  CREATE TYPE product_type AS ENUM ('woordenschat', 'storage_upgrade', 'digitools', 'webwijzer');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE license_type AS ENUM ('trial', 'paid_stripe', 'paid_voucher', 'manual');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE license_status AS ENUM ('active', 'expired', 'cancelled', 'pending');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE transaction_type AS ENUM ('created', 'renewed', 'extended', 'cancelled', 'expired', 'migration');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE voucher_status AS ENUM ('unused', 'redeemed', 'expired', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create organization_licenses table
CREATE TABLE IF NOT EXISTS organization_licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  product_type product_type NOT NULL,
  license_type license_type NOT NULL,
  status license_status NOT NULL DEFAULT 'pending',
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz NOT NULL,
  auto_renew boolean DEFAULT false,
  stripe_subscription_id text,
  voucher_code_id uuid,
  pricing_tier text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL
);

-- Create voucher_codes table
CREATE TABLE IF NOT EXISTS voucher_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  product_type product_type NOT NULL,
  duration_days integer NOT NULL DEFAULT 365,
  pricing_tier text,
  status voucher_status NOT NULL DEFAULT 'unused',
  odoo_reference text,
  expires_at timestamptz,
  redeemed_at timestamptz,
  redeemed_by_organization_id uuid REFERENCES schools(id) ON DELETE SET NULL,
  redeemed_by_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create license_transactions table
CREATE TABLE IF NOT EXISTS license_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id uuid REFERENCES organization_licenses(id) ON DELETE SET NULL,
  organization_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  transaction_type transaction_type NOT NULL,
  product_type product_type NOT NULL,
  payment_method text,
  amount_eur numeric(10, 2),
  stripe_payment_intent_id text,
  voucher_code_id uuid REFERENCES voucher_codes(id) ON DELETE SET NULL,
  previous_valid_until timestamptz,
  new_valid_until timestamptz,
  notes text,
  created_by_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_org_licenses_organization ON organization_licenses(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_licenses_product ON organization_licenses(product_type);
CREATE INDEX IF NOT EXISTS idx_org_licenses_status ON organization_licenses(status);
CREATE INDEX IF NOT EXISTS idx_org_licenses_valid_until ON organization_licenses(valid_until);
CREATE INDEX IF NOT EXISTS idx_org_licenses_org_product ON organization_licenses(organization_id, product_type);

CREATE INDEX IF NOT EXISTS idx_vouchers_code ON voucher_codes(code);
CREATE INDEX IF NOT EXISTS idx_vouchers_status ON voucher_codes(status);
CREATE INDEX IF NOT EXISTS idx_vouchers_product ON voucher_codes(product_type);

CREATE INDEX IF NOT EXISTS idx_transactions_license ON license_transactions(license_id);
CREATE INDEX IF NOT EXISTS idx_transactions_organization ON license_transactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON license_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON license_transactions(created_at DESC);

-- Add foreign key constraint for voucher_code_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'organization_licenses_voucher_code_id_fkey'
  ) THEN
    ALTER TABLE organization_licenses 
    ADD CONSTRAINT organization_licenses_voucher_code_id_fkey 
    FOREIGN KEY (voucher_code_id) REFERENCES voucher_codes(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE organization_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE voucher_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE license_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organization_licenses
CREATE POLICY "Admins can view all licenses"
  ON organization_licenses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Admins can insert licenses"
  ON organization_licenses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Admins can update licenses"
  ON organization_licenses FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- RLS Policies for voucher_codes
CREATE POLICY "Admins can view all vouchers"
  ON voucher_codes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Admins can insert vouchers"
  ON voucher_codes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Admins can update vouchers"
  ON voucher_codes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- RLS Policies for license_transactions
CREATE POLICY "Admins can view all transactions"
  ON license_transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Admins can insert transactions"
  ON license_transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_license_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_org_licenses_updated_at'
  ) THEN
    CREATE TRIGGER update_org_licenses_updated_at
      BEFORE UPDATE ON organization_licenses
      FOR EACH ROW
      EXECUTE FUNCTION update_license_updated_at();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_voucher_codes_updated_at'
  ) THEN
    CREATE TRIGGER update_voucher_codes_updated_at
      BEFORE UPDATE ON voucher_codes
      FOR EACH ROW
      EXECUTE FUNCTION update_license_updated_at();
  END IF;
END $$;
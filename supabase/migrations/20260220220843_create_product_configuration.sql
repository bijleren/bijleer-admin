/*
  # Product Configuration System

  ## Overview
  Creates a product_catalog table to manage product offerings, pricing tiers,
  and descriptions for the license system.

  ## New Tables

  ### `product_catalog`
  - `id` (uuid, primary key) - Unique product identifier
  - `product_type` (product_type enum) - Links to license system
  - `name` (text) - Display name
  - `description` (text) - Product description
  - `is_active` (boolean) - Whether product is available for purchase
  - `base_price_eur` (numeric) - Base annual price in euros
  - `default_duration_days` (integer) - Default license duration
  - `features` (jsonb) - List of product features
  - `created_at`, `updated_at` (timestamptz) - Timestamps

  ### `pricing_tiers`
  - `id` (uuid, primary key) - Unique tier identifier
  - `product_id` (uuid, foreign key) - Links to product_catalog
  - `tier_code` (text) - e.g., 'basic', 'pro', 'enterprise'
  - `tier_name` (text) - Display name
  - `price_eur` (numeric) - Annual price in euros
  - `storage_gb` (integer) - Storage limit for storage upgrades
  - `features` (jsonb) - Tier-specific features
  - `is_active` (boolean) - Whether tier is available
  - `sort_order` (integer) - Display order
  - `created_at`, `updated_at` (timestamptz) - Timestamps

  ## Security
  - Enable RLS on both tables
  - Admin users can manage products and pricing
  - All authenticated users can view active products
*/

-- Create product_catalog table
CREATE TABLE IF NOT EXISTS product_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_type product_type UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  base_price_eur numeric(10, 2),
  default_duration_days integer DEFAULT 365,
  features jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create pricing_tiers table
CREATE TABLE IF NOT EXISTS pricing_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES product_catalog(id) ON DELETE CASCADE,
  tier_code text NOT NULL,
  tier_name text NOT NULL,
  price_eur numeric(10, 2) NOT NULL,
  storage_gb integer,
  features jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(product_id, tier_code)
);

-- Insert default products
INSERT INTO product_catalog (product_type, name, description, base_price_eur, is_active)
VALUES 
  ('woordenschat', 'Woordenschat', 'Complete vocabulary learning platform with personalized exercises and progress tracking', 99.00, true),
  ('storage_upgrade', 'Storage Upgrade', 'Additional storage for your school organization', NULL, true),
  ('digitools', 'DigiTools', 'Digital teaching tools and resources', 49.00, true),
  ('webwijzer', 'WebWijzer', 'Web-based guidance and navigation tools', 39.00, true)
ON CONFLICT (product_type) DO NOTHING;

-- Insert storage upgrade tiers
DO $$
DECLARE
  storage_product_id uuid;
BEGIN
  SELECT id INTO storage_product_id FROM product_catalog WHERE product_type = 'storage_upgrade';
  
  IF storage_product_id IS NOT NULL THEN
    INSERT INTO pricing_tiers (product_id, tier_code, tier_name, price_eur, storage_gb, sort_order)
    VALUES 
      (storage_product_id, 'basic', 'Basic', 29.00, 10, 1),
      (storage_product_id, 'pro', 'Pro', 59.00, 25, 2),
      (storage_product_id, 'enterprise', 'Enterprise', 99.00, 50, 3)
    ON CONFLICT (product_id, tier_code) DO NOTHING;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pricing_tiers_product ON pricing_tiers(product_id);
CREATE INDEX IF NOT EXISTS idx_product_catalog_active ON product_catalog(is_active);

-- Enable RLS
ALTER TABLE product_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_tiers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for product_catalog
CREATE POLICY "Anyone can view active products"
  ON product_catalog FOR SELECT
  TO authenticated
  USING (is_active = true OR EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.email = (SELECT email FROM auth.users WHERE id = auth.uid())
  ));

CREATE POLICY "Admins can insert products"
  ON product_catalog FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Admins can update products"
  ON product_catalog FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- RLS Policies for pricing_tiers
CREATE POLICY "Anyone can view active tiers"
  ON pricing_tiers FOR SELECT
  TO authenticated
  USING (is_active = true OR EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.email = (SELECT email FROM auth.users WHERE id = auth.uid())
  ));

CREATE POLICY "Admins can insert tiers"
  ON pricing_tiers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Admins can update tiers"
  ON pricing_tiers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_product_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_product_catalog_updated_at'
  ) THEN
    CREATE TRIGGER update_product_catalog_updated_at
      BEFORE UPDATE ON product_catalog
      FOR EACH ROW
      EXECUTE FUNCTION update_product_updated_at();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_pricing_tiers_updated_at'
  ) THEN
    CREATE TRIGGER update_pricing_tiers_updated_at
      BEFORE UPDATE ON pricing_tiers
      FOR EACH ROW
      EXECUTE FUNCTION update_product_updated_at();
  END IF;
END $$;
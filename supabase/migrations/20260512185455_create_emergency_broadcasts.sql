/*
  # Create Emergency Broadcasts System

  ## Overview
  A single-row-per-platform system for platform admins to push urgent messages
  to all users of a given platform in real time via Supabase Realtime.

  ## New Table: emergency_broadcasts
  - id          (uuid, PK)
  - platform    (text, UNIQUE) — 'bijleer.school', future app names, or 'all'
  - is_active   (boolean) — master on/off switch
  - type        (text) — 'info' | 'warning' | 'danger'
  - title       (text) — short bold headline
  - content     (text) — full HTML from WYSIWYG editor
  - starts_at   (timestamptz, nullable) — optional scheduled start
  - ends_at     (timestamptz, nullable) — optional scheduled end
  - created_at  (timestamptz)
  - updated_at  (timestamptz) — auto-updated by trigger

  ## Security
  - RLS enabled
  - Admins can read and update
  - Authenticated users can SELECT (to display banner)
*/

CREATE TABLE IF NOT EXISTS emergency_broadcasts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform    text NOT NULL,
  is_active   boolean NOT NULL DEFAULT false,
  type        text NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'danger')),
  title       text NOT NULL DEFAULT '',
  content     text NOT NULL DEFAULT '',
  starts_at   timestamptz,
  ends_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Add unique constraint on platform
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'emergency_broadcasts_platform_key'
  ) THEN
    ALTER TABLE emergency_broadcasts ADD CONSTRAINT emergency_broadcasts_platform_key UNIQUE (platform);
  END IF;
END $$;

-- Auto-update updated_at on every save
CREATE OR REPLACE FUNCTION update_emergency_broadcasts_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS emergency_broadcasts_updated_at ON emergency_broadcasts;
CREATE TRIGGER emergency_broadcasts_updated_at
  BEFORE UPDATE ON emergency_broadcasts
  FOR EACH ROW EXECUTE FUNCTION update_emergency_broadcasts_updated_at();

-- Enable RLS
ALTER TABLE emergency_broadcasts ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read (to show banner)
CREATE POLICY "Authenticated can read emergency_broadcasts"
  ON emergency_broadcasts
  FOR SELECT
  TO authenticated
  USING (true);

-- Admins can update
CREATE POLICY "Admins can update emergency_broadcasts"
  ON emergency_broadcasts
  FOR UPDATE
  TO authenticated
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());

-- Admins can insert (for new platforms)
CREATE POLICY "Admins can insert emergency_broadcasts"
  ON emergency_broadcasts
  FOR INSERT
  TO authenticated
  WITH CHECK (is_current_user_admin());

-- Pre-seed one row per known platform
INSERT INTO emergency_broadcasts (platform, is_active, type, title, content)
SELECT 'bijleer.school', false, 'info', '', ''
WHERE NOT EXISTS (SELECT 1 FROM emergency_broadcasts WHERE platform = 'bijleer.school');

INSERT INTO emergency_broadcasts (platform, is_active, type, title, content)
SELECT 'all', false, 'info', '', ''
WHERE NOT EXISTS (SELECT 1 FROM emergency_broadcasts WHERE platform = 'all');

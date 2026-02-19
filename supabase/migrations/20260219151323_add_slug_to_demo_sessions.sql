/*
  # Add URL Slug to Demo Sessions

  1. Changes
    - Add `slug` column to demo_sessions table for SEO-friendly URLs
    - Make slug unique to prevent conflicts
    - Add index for fast slug lookups
    
  2. Notes
    - Slug is optional (nullable) for backward compatibility
    - Existing sessions can have slugs added later
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'demo_sessions' AND column_name = 'slug'
  ) THEN
    ALTER TABLE demo_sessions ADD COLUMN slug text UNIQUE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_demo_sessions_slug ON demo_sessions(slug);

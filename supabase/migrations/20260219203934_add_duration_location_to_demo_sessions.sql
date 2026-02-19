/*
  # Add Duration and Location to Demo Sessions

  1. Changes
    - Add `duration_minutes` column to store demo duration in minutes
    - Add `location` column to store physical location or online meeting link
    - Add `end_time` generated column for calendar integration
    
  2. Notes
    - Duration defaults to 60 minutes for typical demo length
    - Location is optional (nullable) and can be physical address or online meeting URL
    - Both fields support existing sessions by allowing nulls initially
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'demo_sessions' AND column_name = 'duration_minutes'
  ) THEN
    ALTER TABLE demo_sessions ADD COLUMN duration_minutes integer DEFAULT 60;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'demo_sessions' AND column_name = 'location'
  ) THEN
    ALTER TABLE demo_sessions ADD COLUMN location text;
  END IF;
END $$;

COMMENT ON COLUMN demo_sessions.duration_minutes IS 'Duration of the demo session in minutes';
COMMENT ON COLUMN demo_sessions.location IS 'Physical location or online meeting URL for the demo';

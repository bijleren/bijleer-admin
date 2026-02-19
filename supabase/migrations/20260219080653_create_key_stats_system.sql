/*
  # Create Key Statistics System

  1. New Tables
    - `key_stats`
      - `id` (uuid, primary key)
      - `stat_key` (text, unique) - The name/identifier of the statistic
      - `stat_value` (bigint) - The numerical value of the statistic
      - `last_updated` (timestamptz) - When this stat was last calculated
      - `created_at` (timestamptz)

  2. Functions
    - `refresh_key_stats()` - Calculates and updates all statistics
    - `schedule_nightly_stats_refresh()` - Schedules the refresh to run nightly

  3. Security
    - Enable RLS on `key_stats` table
    - Add policy for authenticated users to read stats
    - Only system can update stats (no public write access)

  4. Statistics Tracked
    - total_words: Total count of all words
    - words_with_image: Words with image_file set
    - words_with_audio: Words with audio_checked set
    - words_with_betekenis: Words with betekenis set
    - words_with_image_and_audio: Words with both image_file and audio_checked
    - words_with_image_and_betekenis: Words with both image_file and betekenis
    - words_with_audio_and_betekenis: Words with both audio_checked and betekenis
    - words_with_all_three: Words with image_file, audio_checked, and betekenis
    - words_complete: Words with all data (image_file, audio_checked, betekenis, klankteken)
*/

-- Create the key_stats table
CREATE TABLE IF NOT EXISTS key_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stat_key text UNIQUE NOT NULL,
  stat_value bigint NOT NULL DEFAULT 0,
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE key_stats ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read stats
CREATE POLICY "Authenticated users can read stats"
  ON key_stats
  FOR SELECT
  TO authenticated
  USING (true);

-- Create function to refresh all statistics
CREATE OR REPLACE FUNCTION refresh_key_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Total words
  INSERT INTO key_stats (stat_key, stat_value, last_updated)
  VALUES ('total_words', (SELECT COUNT(*) FROM wordfrequency), now())
  ON CONFLICT (stat_key) 
  DO UPDATE SET stat_value = EXCLUDED.stat_value, last_updated = EXCLUDED.last_updated;

  -- Words with image_file
  INSERT INTO key_stats (stat_key, stat_value, last_updated)
  VALUES ('words_with_image', (
    SELECT COUNT(*) FROM wordfrequency 
    WHERE image_file IS NOT NULL AND image_file != ''
  ), now())
  ON CONFLICT (stat_key) 
  DO UPDATE SET stat_value = EXCLUDED.stat_value, last_updated = EXCLUDED.last_updated;

  -- Words with audio_checked
  INSERT INTO key_stats (stat_key, stat_value, last_updated)
  VALUES ('words_with_audio', (
    SELECT COUNT(*) FROM wordfrequency 
    WHERE audio_checked = 1
  ), now())
  ON CONFLICT (stat_key) 
  DO UPDATE SET stat_value = EXCLUDED.stat_value, last_updated = EXCLUDED.last_updated;

  -- Words with betekenis
  INSERT INTO key_stats (stat_key, stat_value, last_updated)
  VALUES ('words_with_betekenis', (
    SELECT COUNT(*) FROM wordfrequency 
    WHERE betekenis IS NOT NULL AND betekenis != ''
  ), now())
  ON CONFLICT (stat_key) 
  DO UPDATE SET stat_value = EXCLUDED.stat_value, last_updated = EXCLUDED.last_updated;

  -- Words with image AND audio
  INSERT INTO key_stats (stat_key, stat_value, last_updated)
  VALUES ('words_with_image_and_audio', (
    SELECT COUNT(*) FROM wordfrequency 
    WHERE image_file IS NOT NULL AND image_file != ''
      AND audio_checked = 1
  ), now())
  ON CONFLICT (stat_key) 
  DO UPDATE SET stat_value = EXCLUDED.stat_value, last_updated = EXCLUDED.last_updated;

  -- Words with image AND betekenis
  INSERT INTO key_stats (stat_key, stat_value, last_updated)
  VALUES ('words_with_image_and_betekenis', (
    SELECT COUNT(*) FROM wordfrequency 
    WHERE image_file IS NOT NULL AND image_file != ''
      AND betekenis IS NOT NULL AND betekenis != ''
  ), now())
  ON CONFLICT (stat_key) 
  DO UPDATE SET stat_value = EXCLUDED.stat_value, last_updated = EXCLUDED.last_updated;

  -- Words with audio AND betekenis
  INSERT INTO key_stats (stat_key, stat_value, last_updated)
  VALUES ('words_with_audio_and_betekenis', (
    SELECT COUNT(*) FROM wordfrequency 
    WHERE audio_checked = 1
      AND betekenis IS NOT NULL AND betekenis != ''
  ), now())
  ON CONFLICT (stat_key) 
  DO UPDATE SET stat_value = EXCLUDED.stat_value, last_updated = EXCLUDED.last_updated;

  -- Words with all three (image, audio, betekenis)
  INSERT INTO key_stats (stat_key, stat_value, last_updated)
  VALUES ('words_with_all_three', (
    SELECT COUNT(*) FROM wordfrequency 
    WHERE image_file IS NOT NULL AND image_file != ''
      AND audio_checked = 1
      AND betekenis IS NOT NULL AND betekenis != ''
  ), now())
  ON CONFLICT (stat_key) 
  DO UPDATE SET stat_value = EXCLUDED.stat_value, last_updated = EXCLUDED.last_updated;

  -- Words complete (all data including klankteken)
  INSERT INTO key_stats (stat_key, stat_value, last_updated)
  VALUES ('words_complete', (
    SELECT COUNT(*) FROM wordfrequency 
    WHERE image_file IS NOT NULL AND image_file != ''
      AND audio_checked = 1
      AND betekenis IS NOT NULL AND betekenis != ''
      AND klankteken IS NOT NULL AND klankteken != ''
  ), now())
  ON CONFLICT (stat_key) 
  DO UPDATE SET stat_value = EXCLUDED.stat_value, last_updated = EXCLUDED.last_updated;

  -- Words missing image
  INSERT INTO key_stats (stat_key, stat_value, last_updated)
  VALUES ('words_missing_image', (
    SELECT COUNT(*) FROM wordfrequency 
    WHERE (image_file IS NULL OR image_file = '')
      AND (image IS NULL OR image = '' OR image = '0')
  ), now())
  ON CONFLICT (stat_key) 
  DO UPDATE SET stat_value = EXCLUDED.stat_value, last_updated = EXCLUDED.last_updated;

  -- Words missing audio
  INSERT INTO key_stats (stat_key, stat_value, last_updated)
  VALUES ('words_missing_audio', (
    SELECT COUNT(*) FROM wordfrequency 
    WHERE audio_checked IS NULL OR audio_checked != 1
  ), now())
  ON CONFLICT (stat_key) 
  DO UPDATE SET stat_value = EXCLUDED.stat_value, last_updated = EXCLUDED.last_updated;

  -- Words missing betekenis
  INSERT INTO key_stats (stat_key, stat_value, last_updated)
  VALUES ('words_missing_betekenis', (
    SELECT COUNT(*) FROM wordfrequency 
    WHERE betekenis IS NULL OR betekenis = ''
  ), now())
  ON CONFLICT (stat_key) 
  DO UPDATE SET stat_value = EXCLUDED.stat_value, last_updated = EXCLUDED.last_updated;

  -- Words missing klankteken
  INSERT INTO key_stats (stat_key, stat_value, last_updated)
  VALUES ('words_missing_klankteken', (
    SELECT COUNT(*) FROM wordfrequency 
    WHERE klankteken IS NULL OR klankteken = ''
  ), now())
  ON CONFLICT (stat_key) 
  DO UPDATE SET stat_value = EXCLUDED.stat_value, last_updated = EXCLUDED.last_updated;
END;
$$;

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the refresh to run daily at 2 AM
SELECT cron.schedule(
  'refresh-key-stats-nightly',
  '0 2 * * *',
  'SELECT refresh_key_stats();'
);

-- Run initial calculation
SELECT refresh_key_stats();

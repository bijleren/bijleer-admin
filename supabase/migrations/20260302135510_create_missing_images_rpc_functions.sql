/*
  # Create RPC functions for missing images functionality

  1. New Functions
    - `get_words_without_image` - Retrieves words that don't have images
      - Accepts search_word (text) and sort_type (text) parameters
      - Returns a single word based on the sort criteria
      - Filters for words where both image and image_file are null or empty
      - Supports multiple sort types: shortest, longest, frequency-high, frequency-low, random

  2. Purpose
    - Enables efficient querying of words missing images
    - Provides flexible sorting options for reviewing workflow
    - Optimizes database queries by handling filtering and sorting server-side
*/

CREATE OR REPLACE FUNCTION get_words_without_image(
  search_word text DEFAULT NULL,
  sort_type text DEFAULT 'shortest'
)
RETURNS TABLE (
  id integer,
  word text,
  frequency integer,
  klankteken text,
  image text,
  image_file text
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    w.id,
    w.word,
    w.frequency,
    w.klankteken,
    w.image,
    w.image_file
  FROM wordfrequency w
  WHERE (w.image IS NULL OR w.image = '')
    AND (w.image_file IS NULL OR w.image_file = '')
    AND (search_word IS NULL OR w.word ILIKE '%' || search_word || '%')
  ORDER BY
    CASE 
      WHEN sort_type = 'shortest' THEN LENGTH(w.word)
      WHEN sort_type = 'longest' THEN -LENGTH(w.word)
      WHEN sort_type = 'frequency-high' THEN -w.frequency
      WHEN sort_type = 'frequency-low' THEN w.frequency
      WHEN sort_type = 'random' THEN RANDOM()::integer
      ELSE LENGTH(w.word)
    END
  LIMIT 1;
END;
$$;
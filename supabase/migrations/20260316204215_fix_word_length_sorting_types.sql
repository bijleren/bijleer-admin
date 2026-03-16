/*
  # Fix word length sorting function types

  1. Changes
    - Updates the RPC function to match actual column types (varchar instead of text)
    - Fixes type mismatch error when fetching words sorted by length

  2. Technical Details
    - Changes return type from text to character varying to match database schema
*/

-- Drop the old function
DROP FUNCTION IF EXISTS get_klankgroepen_words_by_length(boolean, integer, integer);

-- Create function with correct types matching the database schema
CREATE OR REPLACE FUNCTION get_klankgroepen_words_by_length(
  p_sort_ascending boolean DEFAULT true,
  p_offset integer DEFAULT 0,
  p_limit integer DEFAULT 100
)
RETURNS TABLE (
  id integer,
  word character varying(255),
  klankteken character varying(255),
  klankgroepenklanken character varying(255)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    w.id,
    w.word,
    w.klankteken,
    w.klankgroepenklanken
  FROM wordfrequency w
  WHERE w.klankgroup_checked = 0
  ORDER BY
    CASE
      WHEN p_sort_ascending THEN LENGTH(w.word)
      ELSE -LENGTH(w.word)
    END,
    w.word
  OFFSET p_offset
  LIMIT p_limit;
END;
$$;

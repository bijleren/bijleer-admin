/*
  # Filter klankgroepen by klankteken_checked

  1. Changes
    - Updates get_klankgroepen_words_by_length function to only show words where klankteken_checked = 1
    - Ensures only validated words from the klankteken check page appear in klankgroepen

  2. Security
    - Maintains SECURITY DEFINER for consistent access control
*/

-- Drop the old function
DROP FUNCTION IF EXISTS get_klankgroepen_words_by_length(boolean, integer, integer);

-- Create function with klankteken_checked filter
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
  WHERE w.klankteken_checked = 1
    AND w.klankgroup_checked = 0
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

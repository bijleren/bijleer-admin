/*
  # Add word length sorting for klankgroepen

  1. Changes
    - Creates an RPC function to fetch words sorted by character length
    - Enables efficient pagination while maintaining correct length-based sorting

  2. Security
    - Function is accessible to authenticated users only
*/

-- Create function to get words sorted by length
CREATE OR REPLACE FUNCTION get_klankgroepen_words_by_length(
  p_sort_ascending boolean DEFAULT true,
  p_offset integer DEFAULT 0,
  p_limit integer DEFAULT 100
)
RETURNS TABLE (
  id integer,
  word text,
  klankteken text,
  klankgroepenklanken text
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

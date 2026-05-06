/*
  # Filter get_klankgroepen_words_by_length to Dutch words only

  ## Summary
  Updates the get_klankgroepen_words_by_length function to only return words
  where language = 'nl', consistent with all other word-processing pages that
  should only operate on Dutch words.
*/

DROP FUNCTION IF EXISTS get_klankgroepen_words_by_length(boolean, integer, integer);

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
    AND w.language = 'nl'
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

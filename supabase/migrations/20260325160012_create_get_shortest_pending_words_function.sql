/*
  # Create function to get shortest pending words
  
  1. New Functions
    - `get_shortest_pending_words(limit_count integer)`
      - Returns the shortest pending words from the entire database
      - Orders by word length first, then alphabetically
      - Limits to specified count (default 100)
  
  2. Purpose
    - Enables Quick Review page to fetch the actual shortest words across all pending words
    - Previously was fetching first 100 records then sorting, missing shorter words that came later
*/

CREATE OR REPLACE FUNCTION get_shortest_pending_words(limit_count integer DEFAULT 100)
RETURNS TABLE (
  id uuid,
  word text,
  batch_id uuid,
  status text,
  created_at timestamptz,
  klankteken text,
  reviewed_by uuid,
  reviewed_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    nw.id,
    nw.word,
    nw.batch_id,
    nw.status,
    nw.created_at,
    nw.klankteken,
    nw.reviewed_by,
    nw.reviewed_at
  FROM new_words nw
  WHERE nw.status = 'pending'
  ORDER BY LENGTH(nw.word) ASC, nw.word ASC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE;
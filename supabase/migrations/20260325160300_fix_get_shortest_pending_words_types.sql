/*
  # Fix get_shortest_pending_words function return types
  
  1. Changes
    - Drop and recreate function with correct return type for klankteken
    - Cast klankteken to text to match function signature
  
  2. Purpose
    - Fixes "structure of query does not match function result type" error
    - Ensures klankteken column type matches expected text type
*/

DROP FUNCTION IF EXISTS get_shortest_pending_words(integer);

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
    nw.klankteken::text,
    nw.reviewed_by,
    nw.reviewed_at
  FROM new_words nw
  WHERE nw.status = 'pending'
  ORDER BY LENGTH(nw.word) ASC, nw.word ASC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE;
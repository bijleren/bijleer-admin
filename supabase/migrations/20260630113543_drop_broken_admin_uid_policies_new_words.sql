-- Drop the broken policies that query auth.users directly (permission denied for authenticated role)
DROP POLICY IF EXISTS "Admin uid can update new_words" ON new_words;
DROP POLICY IF EXISTS "Admin uid can delete new_words" ON new_words;
/*
  # Add admin UPDATE policy to wordfrequency table

  ## Problem
  The wordfrequency table only had a public SELECT policy. There was no UPDATE
  policy, so update calls from the admin dashboard (Check Klankgroepen, Check
  Klankteken, etc.) were silently blocked by RLS. The UI removed the word from
  the list optimistically but nothing was persisted, so on reload the word
  reappeared unchanged.

  ## Changes
  - Add UPDATE policy: only authenticated admin users (is_current_user_admin())
    can update rows in wordfrequency.
*/

CREATE POLICY "Admins can update wordfrequency"
  ON wordfrequency
  FOR UPDATE
  TO authenticated
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());

/*
  # Fix admin_users RLS circular deadlock

  ## Problem
  The existing SELECT policy on admin_users uses a subquery that reads admin_users
  itself to authorize the read — a circular reference that blocks all reads,
  preventing any user from logging in.

  ## Fix
  Replace the self-referencing policy with a simple row-level check:
  each authenticated user can only read the row where email matches their own
  auth.email(). This is sufficient for the app's admin check
  (AuthContext queries admin_users filtered by the current user's email).
*/

DROP POLICY IF EXISTS "Admins can read admin_users" ON admin_users;

CREATE POLICY "Users can read own admin_users row"
  ON admin_users
  FOR SELECT
  TO authenticated
  USING (email = auth.email());

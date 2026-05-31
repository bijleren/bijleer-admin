/*
  # Add admin read-all policy to profiles

  ## Problem
  Admins querying the profiles table only see their own row because
  the existing SELECT policies only allow a user to read their own profile
  or school members' profiles. There is no policy granting admins full read access.

  ## Fix
  Add a SELECT policy that allows any user whose email appears in admin_users
  to read all profiles. Uses auth.email() directly against admin_users to
  avoid the circular-reference pattern that was fixed previously.
*/

CREATE POLICY "Admins can read all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users WHERE email = auth.email()
    )
  );

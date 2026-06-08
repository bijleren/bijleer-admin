
CREATE POLICY "Admins can read all school_teammembers"
  ON school_teammembers FOR SELECT
  TO authenticated
  USING (is_current_user_admin());

CREATE POLICY "Admins can read all groups"
  ON groups FOR SELECT
  TO authenticated
  USING (is_current_user_admin());

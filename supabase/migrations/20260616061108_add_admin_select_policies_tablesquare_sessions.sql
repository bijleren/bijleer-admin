
CREATE POLICY "admin_select_exercise_tablesquare_sessions"
  ON exercise_tablesquare_sessions FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM admin_users WHERE admin_users.email = auth.email()
  ));

CREATE POLICY "admin_select_tafeltest_sessions"
  ON tafeltest_sessions FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM admin_users WHERE admin_users.email = auth.email()
  ));

CREATE POLICY "admin_select_deeltest_sessions"
  ON deeltest_sessions FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM admin_users WHERE admin_users.email = auth.email()
  ));

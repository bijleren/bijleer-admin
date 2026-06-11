
DROP POLICY IF EXISTS "Admins can read all students" ON students;

CREATE POLICY "Admins can read all students" ON students
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM admin_users WHERE admin_users.email = auth.email()
  ));

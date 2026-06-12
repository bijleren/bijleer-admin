
DROP POLICY IF EXISTS "Admins can update wordfrequency" ON wordfrequency;

CREATE POLICY "Admins can update wordfrequency" ON wordfrequency
  FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.email = auth.email()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.email = auth.email()));

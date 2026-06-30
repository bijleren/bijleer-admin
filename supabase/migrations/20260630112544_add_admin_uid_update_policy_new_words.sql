-- Add UUID-based admin update/delete policies for new_words as a reliable fallback
-- auth.email() can be unreliable in some JWT contexts; auth.uid() always works
CREATE POLICY "Admin uid can update new_words"
  ON new_words FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.email = (
        SELECT email FROM auth.users WHERE id = auth.uid()
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.email = (
        SELECT email FROM auth.users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Admin uid can delete new_words"
  ON new_words FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.email = (
        SELECT email FROM auth.users WHERE id = auth.uid()
      )
    )
  );
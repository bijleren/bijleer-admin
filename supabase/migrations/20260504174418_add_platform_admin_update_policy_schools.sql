/*
  # Allow platform admins to update schools

  The existing UPDATE policy only allows school creators and school-level admins.
  Platform admins (in admin_users table) need to be able to update all school fields
  including the new description and internal_note columns.
*/

CREATE POLICY "Platform admins can update schools"
  ON schools FOR UPDATE
  TO authenticated
  USING (
    (SELECT auth.email()) IN (SELECT email FROM admin_users)
  )
  WITH CHECK (
    (SELECT auth.email()) IN (SELECT email FROM admin_users)
  );

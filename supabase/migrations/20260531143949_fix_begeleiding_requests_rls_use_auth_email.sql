/*
  # Fix begeleiding_requests RLS policies

  ## Problem
  The existing admin SELECT and UPDATE policies use:
    (SELECT users.email FROM auth.users WHERE users.id = auth.uid())
  which causes "permission denied for table users" because authenticated users
  cannot query auth.users directly.

  ## Fix
  Replace both affected policies to use auth.email() instead, matching the
  pattern already used by the profiles and schools admin policies in this project.
*/

DROP POLICY IF EXISTS "Platform admins can read all begeleiding requests" ON begeleiding_requests;
DROP POLICY IF EXISTS "Platform admins can update begeleiding request status" ON begeleiding_requests;

CREATE POLICY "Platform admins can read all begeleiding requests"
  ON begeleiding_requests FOR SELECT
  TO authenticated
  USING (
    (EXISTS (
      SELECT 1 FROM school_users
      WHERE school_users.user_id = auth.uid()
        AND school_users.role = 'platform_admin'
    ))
    OR
    (EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.email = auth.email()
    ))
  );

CREATE POLICY "Platform admins can update begeleiding request status"
  ON begeleiding_requests FOR UPDATE
  TO authenticated
  USING (
    (EXISTS (
      SELECT 1 FROM school_users
      WHERE school_users.user_id = auth.uid()
        AND school_users.role = 'platform_admin'
    ))
    OR
    (EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.email = auth.email()
    ))
  )
  WITH CHECK (
    (EXISTS (
      SELECT 1 FROM school_users
      WHERE school_users.user_id = auth.uid()
        AND school_users.role = 'platform_admin'
    ))
    OR
    (EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.email = auth.email()
    ))
  );

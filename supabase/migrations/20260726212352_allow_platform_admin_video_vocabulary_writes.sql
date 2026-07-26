/*
# Allow platform admins to manage educational_video_vocabulary

## Problem
The INSERT/UPDATE/DELETE policies on `educational_video_vocabulary` only allow
users in `school_teammembers` with role='admin'. Platform admins (tracked in
`admin_users` by email) are not necessarily school team members, so they cannot
add direct video links from the Betekenis modal.

## Changes
1. Security (RLS policies on `educational_video_vocabulary`)
   - DROP existing INSERT/UPDATE/DELETE policies.
   - CREATE new policies that allow BOTH:
     a) school team admins (school_teammembers.role = 'admin'), AND
     b) platform admins (email in admin_users).
   - SELECT policy is unchanged (already open to all authenticated users).

## Notes
- Uses the same admin_users email-matching pattern as other admin policies.
- Policies are idempotent (DROP IF EXISTS before CREATE).
*/

-- Helper: platform admin check via email match
-- INSERT
DROP POLICY IF EXISTS "insert_video_vocabulary" ON educational_video_vocabulary;
CREATE POLICY "insert_video_vocabulary" ON educational_video_vocabulary
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM school_teammembers st
      WHERE st.user_id = auth.uid() AND st.role = 'admin' AND st.is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- UPDATE
DROP POLICY IF EXISTS "update_video_vocabulary" ON educational_video_vocabulary;
CREATE POLICY "update_video_vocabulary" ON educational_video_vocabulary
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM school_teammembers st
      WHERE st.user_id = auth.uid() AND st.role = 'admin' AND st.is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM school_teammembers st
      WHERE st.user_id = auth.uid() AND st.role = 'admin' AND st.is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- DELETE
DROP POLICY IF EXISTS "delete_video_vocabulary" ON educational_video_vocabulary;
CREATE POLICY "delete_video_vocabulary" ON educational_video_vocabulary
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM school_teammembers st
      WHERE st.user_id = auth.uid() AND st.role = 'admin' AND st.is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

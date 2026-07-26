/*
# Restrict educational_videos writes to admin-role team members

## Context
The `educational_videos` table previously allowed any authenticated user to INSERT,
and only the original creator to UPDATE/DELETE. The admin specification requires that
only admin-role users (members of a school team with role = 'admin') can create,
edit, or remove global videos — matching the restriction already in place on
`educational_video_vocabulary` and `educational_video_goals`.

## Changes
1. Security (RLS policies on `educational_videos`)
   - DROP existing INSERT policy "Authenticated can insert educational_videos".
   - DROP existing UPDATE policy "Creators can update educational_videos".
   - DROP existing DELETE policy "Creators can delete educational_videos".
   - CREATE new INSERT policy restricted to admin-role team members.
   - CREATE new UPDATE policy restricted to admin-role team members.
   - CREATE new DELETE policy restricted to admin-role team members.
   - SELECT policy is unchanged (global videos visible to any authenticated user;
     school-specific visible to that school's active team members).

## Important notes
- The SELECT policy is intentionally left untouched.
- The admin check uses `school_teammembers.role = 'admin'` and `is_active = true`,
  consistent with the existing `educational_video_vocabulary` policies.
- All policies are idempotent (DROP IF EXISTS before CREATE).
*/

-- INSERT: only admin-role team members can create videos
DROP POLICY IF EXISTS "Authenticated can insert educational_videos" ON educational_videos;
DROP POLICY IF EXISTS "admin_insert_educational_videos" ON educational_videos;
CREATE POLICY "admin_insert_educational_videos" ON educational_videos
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM school_teammembers st
      WHERE st.user_id = auth.uid() AND st.role = 'admin' AND st.is_active = true
    )
  );

-- UPDATE: only admin-role team members can update videos
DROP POLICY IF EXISTS "Creators can update educational_videos" ON educational_videos;
DROP POLICY IF EXISTS "admin_update_educational_videos" ON educational_videos;
CREATE POLICY "admin_update_educational_videos" ON educational_videos
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM school_teammembers st
      WHERE st.user_id = auth.uid() AND st.role = 'admin' AND st.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM school_teammembers st
      WHERE st.user_id = auth.uid() AND st.role = 'admin' AND st.is_active = true
    )
  );

-- DELETE: only admin-role team members can delete videos
DROP POLICY IF EXISTS "Creators can delete educational_videos" ON educational_videos;
DROP POLICY IF EXISTS "admin_delete_educational_videos" ON educational_videos;
CREATE POLICY "admin_delete_educational_videos" ON educational_videos
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM school_teammembers st
      WHERE st.user_id = auth.uid() AND st.role = 'admin' AND st.is_active = true
    )
  );

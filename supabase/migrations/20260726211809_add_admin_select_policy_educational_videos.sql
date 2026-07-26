/*
# Add admin SELECT policy to educational_videos

## Problem
Platform admins (users in admin_users table) cannot see school-specific videos
in the admin video library. The existing SELECT policy only allows:
- Global videos (is_global = true)
- School videos where the user is an active member via user_schools

This means admins using the video management page see no results for school-specific
videos, even though the stats aggregate (which also uses the same table) shows
the correct total via a privileged connection.

## Changes
1. Security (RLS policies on `educational_videos`)
   - ADD a new SELECT policy that allows users in `admin_users` to read all videos.
   - Existing SELECT policy for regular users is unchanged.

## Notes
- Uses `admin_users` table joined on email = auth.jwt() -> email, matching the
  pattern used by other admin read policies in this codebase.
- Policy is idempotent (DROP IF EXISTS before CREATE).
*/

DROP POLICY IF EXISTS "admin_select_educational_videos" ON educational_videos;
CREATE POLICY "admin_select_educational_videos" ON educational_videos
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

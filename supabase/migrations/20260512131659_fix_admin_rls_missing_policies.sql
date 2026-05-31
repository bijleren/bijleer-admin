/*
  # Fix missing admin RLS policies

  ## Problem
  Several tables used by the admin panel had no admin read (or full CRUD) policy,
  causing admins to see incomplete or no data:

  1. contact_messages - no SELECT at all; admins could not read contact form submissions
  2. bug_reports      - SELECT restricted to own user_id; admins could not see all reports
  3. new_words        - SELECT restricted to own import batches; admins could not see all words
  4. import_batches   - SELECT restricted to own batches; admins could not see all batches
  5. students         - SELECT restricted to school membership; Dashboard showed wrong totals
  6. newsletters      - SELECT restricted to school membership; admins could not see all newsletters

  ## Fix
  Add admin SELECT (and full management where appropriate) policies using
  is_current_user_admin(), which is a SECURITY DEFINER function that safely
  checks admin_users without RLS circular reference issues.
*/

-- contact_messages: admins need to read and update (mark as read/replied)
CREATE POLICY "Admins can read all contact_messages"
  ON contact_messages
  FOR SELECT
  TO authenticated
  USING (is_current_user_admin());

CREATE POLICY "Admins can update contact_messages"
  ON contact_messages
  FOR UPDATE
  TO authenticated
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());

-- bug_reports: admins need to read and update all reports
CREATE POLICY "Admins can read all bug_reports"
  ON bug_reports
  FOR SELECT
  TO authenticated
  USING (is_current_user_admin());

CREATE POLICY "Admins can update all bug_reports"
  ON bug_reports
  FOR UPDATE
  TO authenticated
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());

-- new_words: admins need full access for the word review workflow
CREATE POLICY "Admins can read all new_words"
  ON new_words
  FOR SELECT
  TO authenticated
  USING (is_current_user_admin());

CREATE POLICY "Admins can update all new_words"
  ON new_words
  FOR UPDATE
  TO authenticated
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());

CREATE POLICY "Admins can delete new_words"
  ON new_words
  FOR DELETE
  TO authenticated
  USING (is_current_user_admin());

-- import_batches: admins need to read all batches to manage the word import workflow
CREATE POLICY "Admins can read all import_batches"
  ON import_batches
  FOR SELECT
  TO authenticated
  USING (is_current_user_admin());

-- students: admins need to read all students (Dashboard total count, SchoolDetail, etc.)
CREATE POLICY "Admins can read all students"
  ON students
  FOR SELECT
  TO authenticated
  USING (is_current_user_admin());

-- newsletters: admins need to read all newsletters regardless of school_id
CREATE POLICY "Admins can read all newsletters"
  ON newsletters
  FOR SELECT
  TO authenticated
  USING (is_current_user_admin());

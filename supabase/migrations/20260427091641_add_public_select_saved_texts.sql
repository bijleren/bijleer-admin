/*
  # Public read access for saved_texts and saved_text_students

  ## Changes
  - saved_texts: add SELECT policy for anon role (public read)
  - saved_text_students: add SELECT policy for anon role (public read)

  ## Reason
  The student-facing app needs to read these tables without authentication.
  All existing authenticated policies remain untouched.
*/

CREATE POLICY "Public can view saved texts"
  ON saved_texts
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Public can view saved text students"
  ON saved_text_students
  FOR SELECT
  TO anon
  USING (true);

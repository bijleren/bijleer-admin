/*
  # Add admin write policies to kleuter_word_images

  ## Problem
  kleuter_word_images only had school-scoped write policies and a SELECT for
  active images. Admins had no way to insert, update or delete rows with
  source_type = 'admin'.

  ## Changes
  - Add SELECT policy for admins (see all rows including inactive)
  - Add INSERT policy for admins
  - Add UPDATE policy for admins
  - Add DELETE policy for admins
*/

CREATE POLICY "Admins can select all word images"
  ON kleuter_word_images
  FOR SELECT
  TO authenticated
  USING (is_current_user_admin());

CREATE POLICY "Admins can insert word images"
  ON kleuter_word_images
  FOR INSERT
  TO authenticated
  WITH CHECK (is_current_user_admin());

CREATE POLICY "Admins can update word images"
  ON kleuter_word_images
  FOR UPDATE
  TO authenticated
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());

CREATE POLICY "Admins can delete word images"
  ON kleuter_word_images
  FOR DELETE
  TO authenticated
  USING (is_current_user_admin());

/*
  # Add admin management policies for game_questions

  1. Security Changes
    - Add INSERT policy for admins to create game questions
    - Add UPDATE policy for admins to update game questions
    - Add DELETE policy for admins to delete game questions
    - Uses existing is_current_user_admin() function

  2. Important Notes
    - Existing read policy remains unchanged
    - Only admins can modify questions through the admin dashboard
*/

CREATE POLICY "Admins can insert game questions"
  ON game_questions
  FOR INSERT
  TO authenticated
  WITH CHECK (is_current_user_admin());

CREATE POLICY "Admins can update game questions"
  ON game_questions
  FOR UPDATE
  TO authenticated
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());

CREATE POLICY "Admins can delete game questions"
  ON game_questions
  FOR DELETE
  TO authenticated
  USING (is_current_user_admin());

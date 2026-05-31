/*
  # Add admin write policies to exercise_types table

  ## Problem
  exercise_types only had a public SELECT policy. INSERT, UPDATE and DELETE were
  all blocked by RLS, so admins could not create or manage exercise types from
  the dashboard.

  ## Changes
  - INSERT policy: admins only
  - UPDATE policy: admins only
  - DELETE policy: admins only
*/

CREATE POLICY "Admins can insert exercise_types"
  ON exercise_types
  FOR INSERT
  TO authenticated
  WITH CHECK (is_current_user_admin());

CREATE POLICY "Admins can update exercise_types"
  ON exercise_types
  FOR UPDATE
  TO authenticated
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());

CREATE POLICY "Admins can delete exercise_types"
  ON exercise_types
  FOR DELETE
  TO authenticated
  USING (is_current_user_admin());

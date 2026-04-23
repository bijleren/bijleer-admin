/*
  # Add admin management policy for behavior_cards

  1. Security Changes
    - Add policy allowing admins (via is_current_user_admin()) to fully manage all behavior cards
    - This enables the admin dashboard to create, read, update, and delete any behavior card

  2. Important Notes
    - Existing user-level policies remain unchanged
    - Admin policy uses the existing is_current_user_admin() function
*/

CREATE POLICY "Admins can manage all behavior cards"
  ON behavior_cards
  FOR ALL
  TO authenticated
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());

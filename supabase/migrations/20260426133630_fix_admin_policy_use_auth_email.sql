/*
  # Fix admin RLS policies to use auth.email() instead of querying auth.users

  ## Problem
  The previous admin policies used a subquery on auth.users to get the current
  user's email, but the authenticated role does not have SELECT permission on
  auth.users, causing a 403 "permission denied for table users" error.

  ## Fix
  Replace the subquery with auth.email(), which is a built-in Supabase helper
  that returns the email from the current JWT without querying auth.users.

  ## Tables fixed
  - exercise_types
  - word_antonyms
  - word_categories
  - word_category_links
  - word_expression_links
  - word_expressions
  - word_synonyms
*/

-- ─── exercise_types ───────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Admins can insert exercise types" ON exercise_types;
DROP POLICY IF EXISTS "Admins can update exercise types" ON exercise_types;
DROP POLICY IF EXISTS "Admins can delete exercise types" ON exercise_types;

CREATE POLICY "Admins can insert exercise types"
  ON exercise_types FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.email = auth.email()));

CREATE POLICY "Admins can update exercise types"
  ON exercise_types FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.email = auth.email()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.email = auth.email()));

CREATE POLICY "Admins can delete exercise types"
  ON exercise_types FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.email = auth.email()));

-- ─── word_antonyms ────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Admins can insert word_antonyms" ON word_antonyms;
DROP POLICY IF EXISTS "Admins can update word_antonyms" ON word_antonyms;
DROP POLICY IF EXISTS "Admins can delete word_antonyms" ON word_antonyms;

CREATE POLICY "Admins can insert word_antonyms"
  ON word_antonyms FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.email = auth.email()));

CREATE POLICY "Admins can update word_antonyms"
  ON word_antonyms FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.email = auth.email()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.email = auth.email()));

CREATE POLICY "Admins can delete word_antonyms"
  ON word_antonyms FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.email = auth.email()));

-- ─── word_categories ──────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Admins can insert word_categories" ON word_categories;
DROP POLICY IF EXISTS "Admins can update word_categories" ON word_categories;
DROP POLICY IF EXISTS "Admins can delete word_categories" ON word_categories;

CREATE POLICY "Admins can insert word_categories"
  ON word_categories FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.email = auth.email()));

CREATE POLICY "Admins can update word_categories"
  ON word_categories FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.email = auth.email()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.email = auth.email()));

CREATE POLICY "Admins can delete word_categories"
  ON word_categories FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.email = auth.email()));

-- ─── word_category_links ──────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Admins can insert word_category_links" ON word_category_links;
DROP POLICY IF EXISTS "Admins can update word_category_links" ON word_category_links;
DROP POLICY IF EXISTS "Admins can delete word_category_links" ON word_category_links;

CREATE POLICY "Admins can insert word_category_links"
  ON word_category_links FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.email = auth.email()));

CREATE POLICY "Admins can update word_category_links"
  ON word_category_links FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.email = auth.email()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.email = auth.email()));

CREATE POLICY "Admins can delete word_category_links"
  ON word_category_links FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.email = auth.email()));

-- ─── word_expression_links ────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Admins can insert word_expression_links" ON word_expression_links;
DROP POLICY IF EXISTS "Admins can update word_expression_links" ON word_expression_links;
DROP POLICY IF EXISTS "Admins can delete word_expression_links" ON word_expression_links;

CREATE POLICY "Admins can insert word_expression_links"
  ON word_expression_links FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.email = auth.email()));

CREATE POLICY "Admins can update word_expression_links"
  ON word_expression_links FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.email = auth.email()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.email = auth.email()));

CREATE POLICY "Admins can delete word_expression_links"
  ON word_expression_links FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.email = auth.email()));

-- ─── word_expressions ─────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Admins can insert word_expressions" ON word_expressions;
DROP POLICY IF EXISTS "Admins can update word_expressions" ON word_expressions;
DROP POLICY IF EXISTS "Admins can delete word_expressions" ON word_expressions;

CREATE POLICY "Admins can insert word_expressions"
  ON word_expressions FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.email = auth.email()));

CREATE POLICY "Admins can update word_expressions"
  ON word_expressions FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.email = auth.email()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.email = auth.email()));

CREATE POLICY "Admins can delete word_expressions"
  ON word_expressions FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.email = auth.email()));

-- ─── word_synonyms ────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Admins can insert word_synonyms" ON word_synonyms;
DROP POLICY IF EXISTS "Admins can update word_synonyms" ON word_synonyms;
DROP POLICY IF EXISTS "Admins can delete word_synonyms" ON word_synonyms;

CREATE POLICY "Admins can insert word_synonyms"
  ON word_synonyms FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.email = auth.email()));

CREATE POLICY "Admins can update word_synonyms"
  ON word_synonyms FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.email = auth.email()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.email = auth.email()));

CREATE POLICY "Admins can delete word_synonyms"
  ON word_synonyms FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.email = auth.email()));

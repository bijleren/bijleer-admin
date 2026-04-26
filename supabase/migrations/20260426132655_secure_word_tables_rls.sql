/*
  # Secure word_* tables with RLS

  ## Summary
  Enables Row Level Security on six word-related tables and applies consistent
  access control across all of them.

  ## Tables affected
  - word_antonyms
  - word_categories
  - word_category_links
  - word_expression_links
  - word_expressions
  - word_synonyms

  ## Access rules (same pattern for all tables)
  - SELECT: public (anyone, authenticated or not)
  - INSERT / UPDATE / DELETE: only users whose email exists in admin_users

  ## Changes per table
  - Enable RLS
  - Drop any existing stale policies
  - Add 4 clean policies: public SELECT + admin INSERT / UPDATE / DELETE
*/

-- ─── word_antonyms ───────────────────────────────────────────────────────────

ALTER TABLE word_antonyms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view word_antonyms"
  ON word_antonyms FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert word_antonyms"
  ON word_antonyms FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Admins can update word_antonyms"
  ON word_antonyms FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Admins can delete word_antonyms"
  ON word_antonyms FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- ─── word_categories ─────────────────────────────────────────────────────────

ALTER TABLE word_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view word_categories"
  ON word_categories FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert word_categories"
  ON word_categories FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Admins can update word_categories"
  ON word_categories FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Admins can delete word_categories"
  ON word_categories FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- ─── word_category_links ──────────────────────────────────────────────────────

ALTER TABLE word_category_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view word_category_links"
  ON word_category_links FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert word_category_links"
  ON word_category_links FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Admins can update word_category_links"
  ON word_category_links FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Admins can delete word_category_links"
  ON word_category_links FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- ─── word_expression_links ────────────────────────────────────────────────────

ALTER TABLE word_expression_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow insert for all" ON word_expression_links;
DROP POLICY IF EXISTS "allow_insert" ON word_expression_links;
DROP POLICY IF EXISTS "public_insert_word_expression_links" ON word_expression_links;

CREATE POLICY "Anyone can view word_expression_links"
  ON word_expression_links FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert word_expression_links"
  ON word_expression_links FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Admins can update word_expression_links"
  ON word_expression_links FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Admins can delete word_expression_links"
  ON word_expression_links FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- ─── word_expressions ─────────────────────────────────────────────────────────

ALTER TABLE word_expressions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read for all" ON word_expressions;
DROP POLICY IF EXISTS "allow_insert" ON word_expressions;
DROP POLICY IF EXISTS "public_read_word_expressions" ON word_expressions;

CREATE POLICY "Anyone can view word_expressions"
  ON word_expressions FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert word_expressions"
  ON word_expressions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Admins can update word_expressions"
  ON word_expressions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Admins can delete word_expressions"
  ON word_expressions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- ─── word_synonyms ────────────────────────────────────────────────────────────

ALTER TABLE word_synonyms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view word_synonyms"
  ON word_synonyms FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert word_synonyms"
  ON word_synonyms FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Admins can update word_synonyms"
  ON word_synonyms FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Admins can delete word_synonyms"
  ON word_synonyms FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

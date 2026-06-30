-- Add a fallback UPDATE policy so batch owners can update their own new_words
-- (covers the case where is_current_user_admin() may not match)
CREATE POLICY "Batch owner can update new_words"
  ON new_words FOR UPDATE
  TO authenticated
  USING (
    batch_id IN (
      SELECT id FROM import_batches WHERE imported_by = auth.uid()
    )
  )
  WITH CHECK (
    batch_id IN (
      SELECT id FROM import_batches WHERE imported_by = auth.uid()
    )
  );

-- Also allow batch owners to delete their own new_words
CREATE POLICY "Batch owner can delete new_words"
  ON new_words FOR DELETE
  TO authenticated
  USING (
    batch_id IN (
      SELECT id FROM import_batches WHERE imported_by = auth.uid()
    )
  );
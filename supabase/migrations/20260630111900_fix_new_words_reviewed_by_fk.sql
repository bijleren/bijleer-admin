-- Drop FK constraint on reviewed_by so any auth UUID can be stored
ALTER TABLE new_words DROP CONSTRAINT IF EXISTS new_words_reviewed_by_fkey;

-- Drop FK on rejected_by in rejected_words for the same reason
ALTER TABLE rejected_words DROP CONSTRAINT IF EXISTS rejected_words_rejected_by_fkey;

-- Drop FK on imported_by in import_batches for the same reason  
ALTER TABLE import_batches DROP CONSTRAINT IF EXISTS import_batches_imported_by_fkey;
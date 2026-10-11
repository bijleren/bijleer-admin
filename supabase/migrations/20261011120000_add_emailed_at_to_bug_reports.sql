ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS emailed_at timestamptz DEFAULT NULL;

/*
  # Add first_words column to wordfrequency

  ## Summary
  Adds a `first_words` smallint column to track whether a word qualifies as a "kinderwoord"
  (basic vocabulary word for young children).

  ## New Column
  - `first_words` (smallint, default 0)
    - 0 = not yet reviewed
    - 1 = yes, this is a kinderwoord
    - 2 = no, this is not a kinderwoord

  ## Notes
  - Default 0 means all existing rows start as unchecked
  - Only words with fewer than 6 characters are shown in the review interface
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wordfrequency' AND column_name = 'first_words'
  ) THEN
    ALTER TABLE wordfrequency ADD COLUMN first_words smallint NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Add enhanced metadata fields for better film page stats display
-- Date: 2025-11-14

ALTER TABLE movies ADD COLUMN IF NOT EXISTS original_title TEXT;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS original_language VARCHAR(10);
ALTER TABLE movies ADD COLUMN IF NOT EXISTS status VARCHAR(50);
ALTER TABLE movies ADD COLUMN IF NOT EXISTS release_date DATE;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS adult BOOLEAN DEFAULT FALSE;

-- Add comments for clarity
COMMENT ON COLUMN movies.original_title IS 'Original title in native language (e.g., "Das Boot" for German films)';
COMMENT ON COLUMN movies.original_language IS 'ISO 639-1 language code (e.g., "en", "ja", "ko")';
COMMENT ON COLUMN movies.status IS 'Release status: Released, Post Production, Planned, Rumored, Canceled';
COMMENT ON COLUMN movies.release_date IS 'Full release date (more precise than just year)';
COMMENT ON COLUMN movies.adult IS 'Whether film is marked as adult content';

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS movies_status_idx ON movies(status);
CREATE INDEX IF NOT EXISTS movies_release_date_idx ON movies(release_date);

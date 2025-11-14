-- Add list_type to movie_lists for durable watchlist identification
ALTER TABLE movie_lists
  ADD COLUMN IF NOT EXISTS list_type TEXT NOT NULL DEFAULT 'custom',
  ADD CONSTRAINT movie_lists_list_type_chk CHECK (list_type IN ('custom','watchlist'));

-- Backfill existing rows: treat exact name 'Watchlist' (case-insensitive) as watchlist
UPDATE movie_lists
SET list_type = 'watchlist'
WHERE lower(name) = 'watchlist';

-- Enforce at most one watchlist per user via partial unique index
CREATE UNIQUE INDEX IF NOT EXISTS uniq_user_watchlist
ON movie_lists(user_id)
WHERE list_type = 'watchlist';

-- Helpful index for filtering
CREATE INDEX IF NOT EXISTS movie_lists_list_type_idx ON movie_lists(list_type);

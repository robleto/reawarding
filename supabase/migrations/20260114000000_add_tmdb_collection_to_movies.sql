-- Add TMDB collection support for better franchise grouping
-- TMDB's belongs_to_collection provides native franchise grouping

ALTER TABLE movies 
ADD COLUMN IF NOT EXISTS tmdb_collection_id INTEGER,
ADD COLUMN IF NOT EXISTS tmdb_collection_name TEXT;

CREATE INDEX IF NOT EXISTS movies_tmdb_collection_id_idx ON movies(tmdb_collection_id);

COMMENT ON COLUMN movies.tmdb_collection_id IS 'TMDB collection ID from belongs_to_collection - groups franchise films';
COMMENT ON COLUMN movies.tmdb_collection_name IS 'Collection name (e.g., "Fast & Furious Collection")';

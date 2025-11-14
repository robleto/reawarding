-- Add TMDB media enrichment columns
-- These columns will store additional data from TMDB API that's available today

-- First, add any missing basic columns from the original schema
ALTER TABLE movies ADD COLUMN IF NOT EXISTS tagline TEXT;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS writer TEXT;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS production_companies TEXT[];
ALTER TABLE movies ADD COLUMN IF NOT EXISTS production_countries TEXT[];
ALTER TABLE movies ADD COLUMN IF NOT EXISTS spoken_languages TEXT[];
ALTER TABLE movies ADD COLUMN IF NOT EXISTS budget BIGINT;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS revenue BIGINT;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS imdb_votes INTEGER;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS cached_poster_url TEXT;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS cached_thumb_url TEXT;

-- Videos (trailers, clips, teasers, behind-the-scenes)
ALTER TABLE movies ADD COLUMN IF NOT EXISTS videos JSONB DEFAULT '[]'::jsonb;
COMMENT ON COLUMN movies.videos IS 'Array of video objects from TMDB: trailers, clips, teasers. Format: [{key, name, type, site, official}]';

-- Images (backdrops, posters, stills)
ALTER TABLE movies ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '{}'::jsonb;
COMMENT ON COLUMN movies.images IS 'Image collections from TMDB. Format: {backdrops: [{file_path}], posters: [{file_path}]}';

-- Streaming availability (Netflix, Prime, etc.)
ALTER TABLE movies ADD COLUMN IF NOT EXISTS watch_providers JSONB DEFAULT '{}'::jsonb;
COMMENT ON COLUMN movies.watch_providers IS 'Streaming availability by region. Format: {US: {flatrate: [], rent: [], buy: []}}';

-- Similar movies / recommendations
ALTER TABLE movies ADD COLUMN IF NOT EXISTS similar_movies INT[] DEFAULT ARRAY[]::INT[];
COMMENT ON COLUMN movies.similar_movies IS 'Array of TMDB IDs for similar/recommended movies';

-- Keywords/tags for thematic filtering
ALTER TABLE movies ADD COLUMN IF NOT EXISTS keywords TEXT[] DEFAULT ARRAY[]::TEXT[];
COMMENT ON COLUMN movies.keywords IS 'Thematic keywords/tags from TMDB (e.g., "heist", "dystopia")';

-- TMDB reviews (critic/user reviews from TMDB platform)
ALTER TABLE movies ADD COLUMN IF NOT EXISTS tmdb_reviews JSONB DEFAULT '[]'::jsonb;
COMMENT ON COLUMN movies.tmdb_reviews IS 'Reviews from TMDB platform. Format: [{author, content, rating, created_at}]';

-- Alternative titles (international titles, working titles)
ALTER TABLE movies ADD COLUMN IF NOT EXISTS alternative_titles JSONB DEFAULT '[]'::jsonb;
COMMENT ON COLUMN movies.alternative_titles IS 'Alternative titles in different regions. Format: [{title, iso_3166_1, type}]';

-- Backdrop URL (primary backdrop image for hero sections)
ALTER TABLE movies ADD COLUMN IF NOT EXISTS backdrop_url TEXT;
COMMENT ON COLUMN movies.backdrop_url IS 'Primary backdrop/hero image URL from TMDB';

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_movies_similar ON movies USING GIN(similar_movies);
CREATE INDEX IF NOT EXISTS idx_movies_keywords ON movies USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_movies_videos ON movies USING GIN(videos);
CREATE INDEX IF NOT EXISTS idx_movies_watch_providers ON movies USING GIN(watch_providers);

-- Add timestamp for tracking when media enrichment was done
ALTER TABLE movies ADD COLUMN IF NOT EXISTS media_enriched_at TIMESTAMP WITH TIME ZONE;
COMMENT ON COLUMN movies.media_enriched_at IS 'Timestamp when videos, images, and other media data was last fetched from TMDB';

-- Add TMDB popularity and vote_count fields for better sorting/filtering
-- These help identify buzzworthy films vs. obscure releases

ALTER TABLE movies 
ADD COLUMN IF NOT EXISTS vote_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS vote_average DECIMAL(3,1),
ADD COLUMN IF NOT EXISTS popularity DECIMAL(10,3);

-- Create indexes for sorting performance
CREATE INDEX IF NOT EXISTS movies_vote_count_idx ON movies(vote_count);
CREATE INDEX IF NOT EXISTS movies_popularity_idx ON movies(popularity);

-- Add comment for documentation
COMMENT ON COLUMN movies.vote_count IS 'TMDB vote count - indicates audience engagement (higher = more buzzworthy)';
COMMENT ON COLUMN movies.vote_average IS 'TMDB vote average (0-10 scale) - alternative to IMDb rating';
COMMENT ON COLUMN movies.popularity IS 'TMDB popularity score - algorithmic measure of cultural relevance';

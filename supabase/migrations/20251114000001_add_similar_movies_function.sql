-- Content-based similarity function for movie recommendations
-- Calculates similarity scores based on genres, director, keywords, era, and ratings

CREATE OR REPLACE FUNCTION get_similar_movies(
  target_movie_id INT,
  limit_count INT DEFAULT 12
)
RETURNS TABLE (
  id INT,
  title TEXT,
  similarity_score NUMERIC,
  cached_thumb_url TEXT,
  thumb_url TEXT,
  poster_url TEXT,
  release_year INT
)
LANGUAGE plpgsql
AS $$
DECLARE
  target_genres TEXT[];
  target_director TEXT;
  target_keywords TEXT[];
  target_decade INT;
  target_rating NUMERIC;
BEGIN
  -- Get target movie metadata
  SELECT 
    COALESCE(m.genres, ARRAY[]::TEXT[]),
    m.director,
    COALESCE(m.keywords, ARRAY[]::TEXT[]),
    (m.release_year / 10) * 10,
    COALESCE(m.imdb_rating, m.tmdb_rating, 0)
  INTO 
    target_genres,
    target_director,
    target_keywords,
    target_decade,
    target_rating
  FROM movies m
  WHERE m.id = target_movie_id;

  -- If movie not found, return empty
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Calculate similarity scores for all other movies
  RETURN QUERY
  SELECT 
    m.id,
    m.title,
    (
      -- Genre overlap (40% weight) - Jaccard similarity
      (
        CASE 
          WHEN CARDINALITY(target_genres) = 0 OR CARDINALITY(COALESCE(m.genres, ARRAY[]::TEXT[])) = 0 
          THEN 0
          ELSE 
            CAST(CARDINALITY(
              ARRAY(SELECT UNNEST(target_genres) INTERSECT SELECT UNNEST(COALESCE(m.genres, ARRAY[]::TEXT[])))
            ) AS NUMERIC) / 
            CAST(CARDINALITY(
              ARRAY(SELECT UNNEST(target_genres) UNION SELECT UNNEST(COALESCE(m.genres, ARRAY[]::TEXT[])))
            ) AS NUMERIC)
        END * 0.4
      )
      +
      -- Director match (20% weight)
      (
        CASE 
          WHEN target_director IS NOT NULL AND m.director = target_director 
          THEN 0.2 
          ELSE 0 
        END
      )
      +
      -- Keyword overlap (20% weight) - Jaccard similarity
      (
        CASE 
          WHEN CARDINALITY(target_keywords) = 0 OR CARDINALITY(COALESCE(m.keywords, ARRAY[]::TEXT[])) = 0 
          THEN 0
          ELSE 
            CAST(CARDINALITY(
              ARRAY(SELECT UNNEST(target_keywords) INTERSECT SELECT UNNEST(COALESCE(m.keywords, ARRAY[]::TEXT[])))
            ) AS NUMERIC) / 
            CAST(CARDINALITY(
              ARRAY(SELECT UNNEST(target_keywords) UNION SELECT UNNEST(COALESCE(m.keywords, ARRAY[]::TEXT[])))
            ) AS NUMERIC)
        END * 0.2
      )
      +
      -- Decade proximity (10% weight)
      (
        CASE 
          WHEN m.release_year IS NULL THEN 0
          WHEN (m.release_year / 10) * 10 = target_decade THEN 0.1
          WHEN ABS((m.release_year / 10) * 10 - target_decade) = 10 THEN 0.05
          ELSE 0
        END
      )
      +
      -- Rating proximity (10% weight)
      (
        CASE 
          WHEN target_rating = 0 OR COALESCE(m.imdb_rating, m.tmdb_rating, 0) = 0 THEN 0
          ELSE (1 - (ABS(COALESCE(m.imdb_rating, m.tmdb_rating, 0) - target_rating) / 10)) * 0.1
        END
      )
    ) AS similarity_score,
    m.cached_thumb_url,
    m.thumb_url,
    m.poster_url,
    m.release_year
  FROM movies m
  WHERE 
    m.id != target_movie_id
    AND (
      -- Must share at least one genre OR have same director OR share keywords
      CARDINALITY(ARRAY(SELECT UNNEST(target_genres) INTERSECT SELECT UNNEST(COALESCE(m.genres, ARRAY[]::TEXT[])))) > 0
      OR m.director = target_director
      OR CARDINALITY(ARRAY(SELECT UNNEST(target_keywords) INTERSECT SELECT UNNEST(COALESCE(m.keywords, ARRAY[]::TEXT[])))) > 0
    )
  ORDER BY similarity_score DESC, m.imdb_rating DESC NULLS LAST
  LIMIT limit_count;
END;
$$;

-- Add comment
COMMENT ON FUNCTION get_similar_movies IS 'Returns similar movies based on content-based filtering: genres, director, keywords, release era, and ratings. Returns up to limit_count results ordered by similarity score.';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_similar_movies TO authenticated, anon;

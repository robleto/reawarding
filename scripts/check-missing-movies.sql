-- Diagnostic query for Wicked and Zootopia 2
-- Run this in Supabase SQL Editor to see if movies exist and their metadata

-- Check if movies exist
SELECT 
  id,
  title,
  release_year,
  release_date,
  created_at,
  added_at,
  imdb_rating,
  metacritic_score,
  vote_count,
  popularity,
  runtime,
  overview IS NOT NULL as has_overview,
  poster_url IS NOT NULL as has_poster
FROM movies 
WHERE 
  (LOWER(title) LIKE '%wicked%' OR LOWER(title) LIKE '%zootopia%')
  AND release_year >= 2024
ORDER BY created_at DESC;

-- Check recent additions (last 30 days) to see what IS being captured
SELECT 
  title,
  release_year,
  release_date,
  created_at,
  added_at,
  imdb_rating,
  metacritic_score,
  vote_count,
  popularity
FROM movies 
WHERE created_at >= NOW() - INTERVAL '30 days'
  AND release_year IN (2024, 2025)
ORDER BY created_at DESC
LIMIT 20;

-- Check imports log for these movies
SELECT 
  id,
  tmdb_id,
  title,
  release_date,
  source_function,
  import_date,
  status,
  error_message
FROM imports
WHERE 
  (LOWER(title) LIKE '%wicked%' OR LOWER(title) LIKE '%zootopia%')
  AND import_date >= NOW() - INTERVAL '60 days'
ORDER BY import_date DESC;

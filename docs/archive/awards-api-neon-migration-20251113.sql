-- Awards API (Neon) - Initial Film/Shared Awards Schema
-- Date: 2025-11-13
-- Safe to run multiple times (IF NOT EXISTS guarded where possible)

BEGIN;

-- Extensions (id generation + crypto helpers)
CREATE EXTENSION IF NOT EXISTS pgcrypto; -- provides gen_random_uuid(), digest(), gen_random_bytes()

-- =========================
-- Core Entities
-- =========================

-- Ceremonies (Film/Game; domain allows future domains)
CREATE TABLE IF NOT EXISTS ceremonies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL CHECK (domain IN ('film','game')),
  year INT NOT NULL,
  official_name TEXT,
  short_name TEXT,
  event_date DATE,
  location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(domain, year)
);

-- Award Categories (per ceremony)
CREATE TABLE IF NOT EXISTS award_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ceremony_id UUID NOT NULL REFERENCES ceremonies(id) ON DELETE CASCADE,
  canonical_slug TEXT NOT NULL,
  display_name TEXT NOT NULL,
  category_type TEXT NOT NULL CHECK (category_type IN ('work','person','mixed','honor')),
  ordinal INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(ceremony_id, canonical_slug)
);

-- Nominations (work-level + external IDs)
CREATE TABLE IF NOT EXISTS nominations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES award_categories(id) ON DELETE CASCADE,
  is_winner BOOLEAN NOT NULL DEFAULT FALSE,
  work_title TEXT,
  work_year INT,
  imdb_id TEXT,
  tmdb_id INT,
  bgg_id INT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- People (nominees/participants)
CREATE TABLE IF NOT EXISTS people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  imdb_id TEXT,
  alt_names TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(name, imdb_id)
);

-- Link table nomination <> people with role
CREATE TABLE IF NOT EXISTS nomination_people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nomination_id UUID NOT NULL REFERENCES nominations(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  role TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(nomination_id, person_id, role)
);

-- Indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_nominations_imdb_id ON nominations(imdb_id);
CREATE INDEX IF NOT EXISTS idx_nominations_tmdb_id ON nominations(tmdb_id);
CREATE INDEX IF NOT EXISTS idx_categories_ceremony ON award_categories(ceremony_id);
CREATE INDEX IF NOT EXISTS idx_nomination_people_nomination ON nomination_people(nomination_id);
CREATE INDEX IF NOT EXISTS idx_nomination_people_person ON nomination_people(person_id);

-- =========================
-- JSON Helper: get film awards by imdb_id
-- =========================

-- Returns nested JSON with ceremony/category context and people per nomination
CREATE OR REPLACE FUNCTION get_film_awards_by_imdb(p_imdb TEXT)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  result JSON;
BEGIN
  WITH base AS (
    SELECT 
      n.id AS nomination_id,
      n.is_winner,
      n.work_title,
      n.work_year,
      n.imdb_id,
      n.tmdb_id,
      ac.canonical_slug AS category_slug,
      ac.display_name AS category_name,
      ac.category_type,
      c.year AS ceremony_year,
      c.official_name AS ceremony_official_name,
      c.short_name AS ceremony_short_name
    FROM nominations n
    JOIN award_categories ac ON ac.id = n.category_id
    JOIN ceremonies c ON c.id = ac.ceremony_id
    WHERE c.domain = 'film' AND n.imdb_id = p_imdb
  ), people_agg AS (
    SELECT 
      np.nomination_id,
      json_agg(json_build_object(
        'name', p.name,
        'imdb_id', p.imdb_id,
        'role', np.role
      ) ORDER BY p.name) AS people
    FROM nomination_people np
    JOIN people p ON p.id = np.person_id
    GROUP BY np.nomination_id
  ), rows AS (
    SELECT 
      b.nomination_id,
      json_build_object(
        'ceremony_year', b.ceremony_year,
        'ceremony_official_name', b.ceremony_official_name,
        'ceremony_short_name', b.ceremony_short_name,
        'category_slug', b.category_slug,
        'category_name', b.category_name,
        'category_type', b.category_type,
        'is_winner', b.is_winner,
        'work_title', b.work_title,
        'work_year', b.work_year,
        'imdb_id', b.imdb_id,
        'tmdb_id', b.tmdb_id,
        'people', COALESCE(pa.people, '[]'::json)
      ) AS entry
    FROM base b
    LEFT JOIN people_agg pa ON pa.nomination_id = b.nomination_id
  )
  SELECT json_build_object(
    'imdb_id', p_imdb,
    'nominations', COALESCE(json_agg(r.entry ORDER BY (r.entry->>'ceremony_year')::INT, r.entry->>'category_slug'), '[]'::json)
  )
  INTO result
  FROM rows r;

  IF result IS NULL THEN
    RETURN json_build_object('imdb_id', p_imdb, 'nominations', json_build_array());
  END IF;
  RETURN result;
END;
$$;

-- =========================
-- Optional: badge helper (basic)
-- =========================
-- This function computes a minimal set of badges based on nominations data.
CREATE OR REPLACE FUNCTION get_film_award_badges_by_imdb(p_imdb TEXT)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  win_count INT := 0;
  nom_count INT := 0;
  major_win_count INT := 0;
  badges TEXT[] := ARRAY[]::TEXT[];
BEGIN
  SELECT 
    SUM(CASE WHEN n.is_winner THEN 1 ELSE 0 END),
    COUNT(*)
  INTO win_count, nom_count
  FROM nominations n
  JOIN award_categories ac ON ac.id = n.category_id
  JOIN ceremonies c ON c.id = ac.ceremony_id
  WHERE c.domain = 'film' AND n.imdb_id = p_imdb;

  SELECT 
    COALESCE(SUM(CASE WHEN n.is_winner AND ac.canonical_slug IN (
      'best-picture','director','lead-actor','lead-actress','screenplay-adapted','screenplay-original'
    ) THEN 1 ELSE 0 END), 0)
  INTO major_win_count
  FROM nominations n
  JOIN award_categories ac ON ac.id = n.category_id
  JOIN ceremonies c ON c.id = ac.ceremony_id
  WHERE c.domain = 'film' AND n.imdb_id = p_imdb;

  IF win_count > 0 THEN badges := array_append(badges, 'Oscar Winner'); END IF;
  IF major_win_count > 0 THEN badges := array_append(badges, 'Major Category Winner'); END IF;
  IF nom_count >= 2 THEN badges := array_append(badges, 'Multiple Nominations'); END IF;

  RETURN json_build_object(
    'imdb_id', p_imdb,
    'nominations', nom_count,
    'wins', win_count,
    'badges', badges
  );
END;
$$;

COMMIT;

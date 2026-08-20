-- Lets scripts/check-collection-drift.mjs diff a collection's membership
-- against the TMDB source it's supposed to track. Collections with no
-- reliable external source (category 'lists', or 'The Muppets' which has no
-- single covering TMDB collection) get tmdb_source_type = 'none' and only
-- receive data-quality checks (zero-count, missing posters), not a real diff.

ALTER TABLE film_collections
  ADD COLUMN IF NOT EXISTS tmdb_source_type text
    CHECK (tmdb_source_type IN ('collection', 'company', 'none')),
  ADD COLUMN IF NOT EXISTS tmdb_source_ids integer[];

COMMENT ON COLUMN film_collections.tmdb_source_type IS
  '''collection'' = diff against one or more TMDB /collection/{id} part lists (tmdb_source_ids). ''company'' = diff against TMDB discover-by-company (tmdb_source_ids), heuristically filtered to theatrical features. ''none'' = no external source; only data-quality checks apply.';
COMMENT ON COLUMN film_collections.tmdb_source_ids IS
  'TMDB collection or company id(s) this film_collections row tracks. Multiple ids supported (e.g. Star Trek spans three separate TMDB collections).';

UPDATE film_collections SET tmdb_source_type = 'collection', tmdb_source_ids = ARRAY[9485] WHERE slug = 'fast-and-furious';
UPDATE film_collections SET tmdb_source_type = 'collection', tmdb_source_ids = ARRAY[151, 115570, 115575] WHERE slug = 'star-trek';
UPDATE film_collections SET tmdb_source_type = 'collection', tmdb_source_ids = ARRAY[10] WHERE slug = 'star-wars-saga';
UPDATE film_collections SET tmdb_source_type = 'collection', tmdb_source_ids = ARRAY[748] WHERE slug = 'x-men';

-- Marvel Studios: consistent single studio across the whole run, so
-- discover-by-company is a solid proxy for "theatrical MCU film".
UPDATE film_collections SET tmdb_source_type = 'company', tmdb_source_ids = ARRAY[420] WHERE slug = 'marvel-cinematic-universe';

-- DC has no single studio spanning Superman (1978) -> DCEU -> DCU: WB,
-- Atlas Entertainment, DC Films, and (2023+) DC Studios all apply to
-- different eras. Company 184898 only catches new DC Studios-era
-- additions going forward; it will not validate the pre-2023 catalog.
UPDATE film_collections SET tmdb_source_type = 'company', tmdb_source_ids = ARRAY[184898] WHERE slug = 'dc-universe';

UPDATE film_collections SET tmdb_source_type = 'company', tmdb_source_ids = ARRAY[6125] WHERE slug = 'disney-animation';
UPDATE film_collections SET tmdb_source_type = 'company', tmdb_source_ids = ARRAY[521] WHERE slug = 'dreamworks';
UPDATE film_collections SET tmdb_source_type = 'company', tmdb_source_ids = ARRAY[3] WHERE slug = 'pixar-collection';

-- No reliable external source: 'the-muppets' (TMDB's own Muppets collection
-- only covers 2011/2014) and the three hand-curated 'lists' entries.
UPDATE film_collections SET tmdb_source_type = 'none' WHERE tmdb_source_type IS NULL;

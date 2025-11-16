-- One-time backfill runner: processes all gaps in batched calls
-- Run in Supabase SQL editor. Requires wrappers and Vault secrets already set.

-- 1) Inspect current gaps
select
  (select count(*) from movies where tmdb_id is null or tmdb_id = 0) as missing_tmdb,
  (select count(*) from movies where (imdb_id is null or imdb_id = '') and tmdb_id is not null and tmdb_id <> 0) as missing_imdb_with_tmdb;

-- 2) Run tmdb pass in batches (fills tmdb_id by title/year search)
-- Adjust batch_size if needed; the Edge Function rate-limits internally
DO $$
DECLARE
  batch_size int := 1000;
  total int;
  offset_val int := 0;
BEGIN
  SELECT count(*) INTO total FROM movies WHERE tmdb_id IS NULL OR tmdb_id = 0;
  WHILE offset_val < total LOOP
    PERFORM admin.invoke_backfill_external_ids('tmdb', batch_size, offset_val, false);
    offset_val := offset_val + batch_size;
  END LOOP;
END$$;

-- 3) Run imdb pass in batches (fills imdb_id for rows that already have tmdb_id)
DO $$
DECLARE
  batch_size int := 1000;
  total int;
  offset_val int := 0;
BEGIN
  SELECT count(*) INTO total FROM movies WHERE (imdb_id IS NULL OR imdb_id = '') AND tmdb_id IS NOT NULL AND tmdb_id <> 0;
  WHILE offset_val < total LOOP
    PERFORM admin.invoke_backfill_external_ids('imdb', batch_size, offset_val, false);
    offset_val := offset_val + batch_size;
  END LOOP;
END$$;

-- 4) Check results
select
  (select count(*) from movies where tmdb_id is null or tmdb_id = 0) as remaining_missing_tmdb,
  (select count(*) from movies where (imdb_id is null or imdb_id = '') and tmdb_id is not null and tmdb_id <> 0) as remaining_missing_imdb_with_tmdb;

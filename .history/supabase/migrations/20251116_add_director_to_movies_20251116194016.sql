-- Add director column to movies for ready-made lists based on director
-- Safe additive change; backfill can be handled by enrichment jobs.

alter table if exists public.movies
  add column if not exists director text;

-- Optional: simple index to speed grouping/filtering by director
create index if not exists idx_movies_director on public.movies using btree (director);
